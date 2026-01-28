// src/csharp_gen.js
/* global Blockly */
import { TYPE_TO_CS, listTypeToElementType, indentLines } from "./config.js";

/**
 * C# generator designed for your confirmed constraints:
 * - Statement blocks are treated as one "line unit" (except control blocks that generate braced blocks).
 * - Reporter blocks are expressions only.
 * - Blocks not connected to events/procedures are ignored.
 * - Scope-out usages (collision/other/proc-arg) are commented out at generation time (no warnings at edit time).
 */

const ORDER_ATOMIC = 0; // not strictly required because we always parenthesize operators, but kept for transparency.

function paren(x) {
  return `(${x})`;
}

function csTypeOfBlocklyType(t) {
  if (!t) return "var";
  if (t.startsWith("List_")) {
    const elem = listTypeToElementType(t);
    const elemCs = elem ? csTypeOfBlocklyType(elem) : "object";
    return `List<${elemCs}>`;
  }
  return TYPE_TO_CS[t] ?? t;
}

function varFieldName(field) {
  const v = field?.getVariable?.();
  return v ? v.name : "";
}

function valueCode(block, inputName, ctx) {
  const child = block.getInputTargetBlock(inputName);
  if (!child) return { code: defaultValueForExpected(block, inputName), illegal: false };
  return expr(child, ctx);
}

function defaultValueForExpected(block, inputName) {
  // If a value input is empty, we return a safe default.
  // (You allowed "silent errors" & user responsibility; we still try to keep C# compilable when possible.)
  const input = block.getInput(inputName);
  const checks = input?.connection?.check_ ?? null;
  const t = Array.isArray(checks) ? checks[0] : checks;
  switch (t) {
    case "int": return "0";
    case "float": return "0f";
    case "bool": return "false";
    case "string": return "\"\"";
    case "Vector2": return "Vector2.zero";
    case "Vector3": return "Vector3.zero";
    case "Quaternion": return "Quaternion.identity";
    case "Color": return "Color.white";
    default: return "null";
  }
}

function expr(block, ctx) {
  // Reporter blocks: return {code, illegal}
  switch (block.type) {
    // constants
    case "const_int": return { code: String(block.getFieldValue("N")|0), illegal:false };
    case "const_float": {
      const v = Number(block.getFieldValue("N"));
      // Ensure 'f' suffix
      return { code: (Number.isFinite(v) ? `${v}f` : "0f"), illegal:false };
    }
    case "const_bool": return { code: block.getFieldValue("B")==="true" ? "true" : "false", illegal:false };
    case "const_string": {
      const s = String(block.getFieldValue("S") ?? "");
      const esc = s.replace(/\\/g,"\\\\").replace(/"/g,'\\"');
      return { code: `"${esc}"`, illegal:false };
    }

    // var get (typed)
    case "var_get": {
      const name = varFieldName(block.getField("VAR"));
      return { code: name || "/* var */", illegal:false };
    }

    // casts
    case "cast_int_to_float": {
      const v = valueCode(block,"V",ctx);
      return { code: `(float)${paren(v.code)}`, illegal: v.illegal };
    }
    case "cast_float_to_int": {
      const v = valueCode(block,"V",ctx);
      return { code: `(int)${paren(v.code)}`, illegal: v.illegal };
    }

    // arithmetic / comparisons / logic
    case "arith_int":
    case "arith_float":
    case "cmp_int":
    case "cmp_float":
    case "eq_bool":
    case "eq_string": {
      const a = valueCode(block,"A",ctx);
      const b = valueCode(block,"B",ctx);
      const op = block.getFieldValue("OP");
      return { code: paren(`${a.code} ${op} ${b.code}`), illegal: a.illegal || b.illegal };
    }
    case "logic_and": {
      const a=valueCode(block,"A",ctx), b=valueCode(block,"B",ctx);
      return { code: paren(`${a.code} && ${b.code}`), illegal: a.illegal||b.illegal };
    }
    case "logic_or": {
      const a=valueCode(block,"A",ctx), b=valueCode(block,"B",ctx);
      return { code: paren(`${a.code} || ${b.code}`), illegal: a.illegal||b.illegal };
    }
    case "logic_not": {
      const a=valueCode(block,"A",ctx);
      return { code: paren(`!${paren(a.code)}`), illegal: a.illegal };
    }

    // Mathf
    case "mathf_abs": return callStatic("Mathf.Abs", ["X"], block, ctx);
    case "mathf_clamp": return callStatic("Mathf.Clamp", ["X","MIN","MAX"], block, ctx);
    case "mathf_clamp01": return callStatic("Mathf.Clamp01", ["X"], block, ctx);
    case "mathf_min": return callStatic("Mathf.Min", ["A","B"], block, ctx);
    case "mathf_max": return callStatic("Mathf.Max", ["A","B"], block, ctx);
    case "mathf_lerp": return callStatic("Mathf.Lerp", ["A","B","T"], block, ctx);
    case "mathf_sqrt": return callStatic("Mathf.Sqrt", ["X"], block, ctx);

    // vector constructors/constants
    case "make_vector2": return ctor("new Vector2", ["X","Y"], block, ctx);
    case "make_vector3": return ctor("new Vector3", ["X","Y","Z"], block, ctx);
    case "quat_euler": return callStatic("Quaternion.Euler", ["E"], block, ctx);
    case "color_rgba": return ctor("new Color", ["R","G","B","A"], block, ctx);
    case "vec3_zero": return { code:"Vector3.zero", illegal:false };
    case "quat_identity": return { code:"Quaternion.identity", illegal:false };
    case "color_white": return { code:"Color.white", illegal:false };
    case "color_black": return { code:"Color.black", illegal:false };

    // Vector ops
    case "vec3_add":
    case "vec3_sub": {
      const a=valueCode(block,"A",ctx), b=valueCode(block,"B",ctx);
      const op = block.type==="vec3_add" ? "+" : "-";
      return { code: paren(`${a.code} ${op} ${b.code}`), illegal: a.illegal||b.illegal };
    }
    case "vec3_mul":
    case "vec3_div": {
      const v=valueCode(block,"V",ctx), s=valueCode(block,"S",ctx);
      const op = block.type==="vec3_mul" ? "*" : "/";
      return { code: paren(`${v.code} ${op} ${s.code}`), illegal: v.illegal||s.illegal };
    }
    case "vec3_magnitude": {
      const v=valueCode(block,"V",ctx);
      return { code: `${paren(v.code)}.magnitude`, illegal: v.illegal };
    }
    case "vec3_normalized": {
      const v=valueCode(block,"V",ctx);
      return { code: `${paren(v.code)}.normalized`, illegal: v.illegal };
    }
    case "vec3_distance": return callStatic("Vector3.Distance", ["A","B"], block, ctx);
    case "vec3_dot": return callStatic("Vector3.Dot", ["A","B"], block, ctx);
    case "vec3_cross": return callStatic("Vector3.Cross", ["A","B"], block, ctx);

    // Time
    case "time_deltaTime": return { code: "Time.deltaTime", illegal:false };
    case "time_time": return { code: "Time.time", illegal:false };

    // Input
    case "input_getkey": {
      const key = block.getFieldValue("KEY");
      const mode = block.getFieldValue("MODE");
      const fn = mode==="down" ? "Input.GetKeyDown" : mode==="up" ? "Input.GetKeyUp" : "Input.GetKey";
      return { code: `${fn}(KeyCode.${key})`, illegal:false };
    }
    case "input_getmouse": {
      const btn = block.getFieldValue("BTN");
      const mode = block.getFieldValue("MODE");
      const fn = mode==="down" ? "Input.GetMouseButtonDown" : mode==="up" ? "Input.GetMouseButtonUp" : "Input.GetMouseButton";
      return { code: `${fn}(${btn})`, illegal:false };
    }
    case "input_getaxis": {
      const axis = block.getFieldValue("AXIS");
      return { code: `Input.GetAxis("${axis}")`, illegal:false };
    }
    case "input_mousepos": return { code: "Input.mousePosition", illegal:false };

    // GameObject / Transform bridge
    case "go_get_transform": {
      const go=valueCode(block,"GO",ctx);
      return { code: `${paren(go.code)}.transform`, illegal: go.illegal };
    }
    case "tr_get_gameobject": {
      const tr=valueCode(block,"TR",ctx);
      return { code: `${paren(tr.code)}.gameObject`, illegal: tr.illegal };
    }

    // Transform getters
    case "tr_pos": return propGet("TR", "position", block, ctx);
    case "tr_lpos": return propGet("TR", "localPosition", block, ctx);
    case "tr_rot": return propGet("TR", "rotation", block, ctx);
    case "tr_lrot": return propGet("TR", "localRotation", block, ctx);
    case "tr_euler": return propGet("TR", "eulerAngles", block, ctx);
    case "tr_leuler": return propGet("TR", "localEulerAngles", block, ctx);
    case "tr_forward": return propGet("TR", "forward", block, ctx);
    case "tr_right": return propGet("TR", "right", block, ctx);
    case "tr_up": return propGet("TR", "up", block, ctx);

    // Rigidbody getters
    case "rb_get_useGravity": return propGet("RB","useGravity", block, ctx);
    case "rb_get_isKinematic": return propGet("RB","isKinematic", block, ctx);
    case "rb_get_mass": return propGet("RB","mass", block, ctx);
    case "rb_get_vel": return propGet("RB","velocity", block, ctx);
    case "rb_get_angvel": return propGet("RB","angularVelocity", block, ctx);

    // RaycastHit property reporters
    case "hit_point": return propGet("H","point", block, ctx);
    case "hit_normal": return propGet("H","normal", block, ctx);
    case "hit_distance": return propGet("H","distance", block, ctx);
    case "hit_collider": return propGet("H","collider", block, ctx);
    case "hit_transform": return propGet("H","transform", block, ctx);

    // Collider
    case "col_get_go": return propGet("C","gameObject", block, ctx);
    case "col_get_tr": return propGet("C","transform", block, ctx);

    // Collision / other fixed blocks (scope checked)
    case "collision_get_collider":
    case "collision_get_go":
    case "collision_get_tr": {
      const ok = ctx.scope === "event" && ctx.eventParam === "collision";
      if (!ok) ctx.illegal = true;
      const member = block.type==="collision_get_collider" ? "collider" : block.type==="collision_get_go" ? "gameObject" : "transform";
      return { code: `collision.${member}`, illegal: !ok };
    }
    case "other_get":
    case "other_get_go":
    case "other_get_tr": {
      const ok = ctx.scope === "event" && ctx.eventParam === "other";
      if (!ok) ctx.illegal = true;
      const code = block.type==="other_get" ? "other" : block.type==="other_get_go" ? "other.gameObject" : "other.transform";
      return { code, illegal: !ok };
    }

    // Animator / Audio / UI reporters
    case "anim_get_speed": return propGet("A","speed", block, ctx);
    case "aud_get_volume": return propGet("S","volume", block, ctx);
    case "aud_get_pitch": return propGet("S","pitch", block, ctx);
    case "aud_get_loop": return propGet("S","loop", block, ctx);
    case "tmp_get_text": return propGet("T","text", block, ctx);

    // List reporters
    case "list_contains":
    case "list_indexof":
    case "list_count":
    case "list_get": {
      // list var is a field, not a value input
      const listName = varFieldName(block.getField("L")) || "/* list */";
      const idx = (block.type==="list_count") ? null :
                  (block.type==="list_get") ? valueCode(block,"I",ctx) : null;
      const v = (block.type==="list_contains" || block.type==="list_indexof") ? valueCode(block,"V",ctx) : null;

      if (block.type==="list_count") return { code: `${listName}.Count`, illegal:false };
      if (block.type==="list_get") return { code: `${listName}[${idx.code}]`, illegal: idx.illegal };
      if (block.type==="list_contains") return { code: `${listName}.Contains(${v.code})`, illegal: v.illegal };
      if (block.type==="list_indexof") return { code: `${listName}.IndexOf(${v.code})`, illegal: v.illegal };
    }

    // Procedure call (value)
    default:
      if (block.type.startsWith("proc_call_val_")) {
        const procId = block.type.slice("proc_call_val_".length);
        return procCallExpr(procId, block, ctx);
      }
      if (block.type.startsWith("proc_arg_")) {
        // proc_arg_<id>_<i>
        const m = block.type.match(/^proc_arg_(.+)_(\d+)$/);
        const procId = m ? m[1] : "";
        const ok = ctx.scope === "proc" && ctx.procId === procId;
        if (!ok) ctx.illegal = true;
        return { code: String(block.getFieldValue("ARG") || "arg"), illegal: !ok };
      }
      // Fallback
      return { code: "/* expr */", illegal:false };
  }
}

function callStatic(fn, inputs, block, ctx) {
  const parts = [];
  let illegal = false;
  for (const n of inputs) {
    const v = valueCode(block, n, ctx);
    parts.push(v.code);
    illegal ||= v.illegal;
  }
  return { code: `${fn}(${parts.join(", ")})`, illegal };
}
function ctor(prefix, inputs, block, ctx) {
  const parts = [];
  let illegal = false;
  for (const n of inputs) {
    const v = valueCode(block, n, ctx);
    parts.push(v.code);
    illegal ||= v.illegal;
  }
  return { code: `${prefix}(${parts.join(", ")})`, illegal };
}
function propGet(inputName, prop, block, ctx) {
  const v = valueCode(block, inputName, ctx);
  return { code: `${paren(v.code)}.${prop}`, illegal: v.illegal };
}

function statement(block, ctx) {
  // Statement blocks: return {lines:[...], illegal:boolean}
  const localCtx = { ...ctx, illegal:false }; // accumulate illegal flag within statement
  const t = block.type;

  // utility to get expression from input
  const V = (name) => valueCode(block, name, localCtx);

  if (t === "var_set") {
    const name = varFieldName(block.getField("VAR")) || "/* var */";
    const v = V("VALUE");
    return { lines: [`${name} = ${v.code};`], illegal: localCtx.illegal || v.illegal };
  }

  if (t === "ctrl_if" || t === "ctrl_if_else") {
    const c = V("COND");
    const body = statementsFromInput(block, "DO", localCtx);
    const elseBody = (t==="ctrl_if_else") ? statementsFromInput(block, "ELSE", localCtx) : [];
    const lines = [];
    lines.push(`if (${c.code}) {`);
    lines.push(...indentLines(body, 1));
    lines.push("}");
    if (t==="ctrl_if_else") {
      lines.push("else {");
      lines.push(...indentLines(elseBody, 1));
      lines.push("}");
    }
    return { lines, illegal: localCtx.illegal || c.illegal };
  }

  if (t === "ctrl_repeat") {
    const cnt = V("COUNT");
    const body = statementsFromInput(block, "DO", localCtx);
    const iName = "__i"; // temp index; you allowed internal temp vars to be user-responsibility (errors allowed)
    const lines = [];
    lines.push(`for (int ${iName} = 0; ${iName} < ${cnt.code}; ${iName}++) {`);
    lines.push(...indentLines(body, 1));
    lines.push("}");
    return { lines, illegal: localCtx.illegal || cnt.illegal };
  }

  if (t === "ctrl_while") {
    const c = V("COND");
    const body = statementsFromInput(block, "DO", localCtx);
    const lines = [];
    lines.push(`while (${c.code}) {`);
    lines.push(...indentLines(body, 1));
    lines.push("}");
    return { lines, illegal: localCtx.illegal || c.illegal };
  }

  if (t === "ctrl_break") return { lines:["break;"], illegal:false };

  // Transform setters/methods
  if (t.startsWith("tr_set_")) {
    const tr = V("TR"); const rhs = V(t.includes("rot") ? "Q" : t.includes("euler") ? "E" : "V");
    const prop = t==="tr_set_pos" ? "position" :
                 t==="tr_set_lpos" ? "localPosition" :
                 t==="tr_set_rot" ? "rotation" :
                 t==="tr_set_lrot" ? "localRotation" :
                 t==="tr_set_euler" ? "eulerAngles" :
                 "localEulerAngles";
    return { lines:[`${paren(tr.code)}.${prop} = ${rhs.code};`], illegal: tr.illegal||rhs.illegal||localCtx.illegal };
  }
  if (t==="tr_translate") {
    const tr=V("TR"), d=V("D");
    return { lines:[`${paren(tr.code)}.Translate(${d.code});`], illegal: tr.illegal||d.illegal||localCtx.illegal };
  }
  if (t==="tr_rotate") {
    const tr=V("TR"), e=V("E");
    return { lines:[`${paren(tr.code)}.Rotate(${e.code});`], illegal: tr.illegal||e.illegal||localCtx.illegal };
  }
  if (t==="tr_lookat_tr") {
    const tr=V("TR"), tt=V("T");
    return { lines:[`${paren(tr.code)}.LookAt(${tt.code});`], illegal: tr.illegal||tt.illegal||localCtx.illegal };
  }
  if (t==="tr_lookat_v3") {
    const tr=V("TR"), p=V("P");
    return { lines:[`${paren(tr.code)}.LookAt(${p.code});`], illegal: tr.illegal||p.illegal||localCtx.illegal };
  }

  // Rigidbody methods
  if (t==="rb_addforce") {
    const rb=V("RB"), f=V("F"); const mode=block.getFieldValue("MODE");
    return { lines:[`${paren(rb.code)}.AddForce(${f.code}, ForceMode.${mode});`], illegal: rb.illegal||f.illegal||localCtx.illegal };
  }
  if (t==="rb_addtorque") {
    const rb=V("RB"), tq=V("TQ"); const mode=block.getFieldValue("MODE");
    return { lines:[`${paren(rb.code)}.AddTorque(${tq.code}, ForceMode.${mode});`], illegal: rb.illegal||tq.illegal||localCtx.illegal };
  }
  if (t==="rb_movepos") {
    const rb=V("RB"), p=V("P");
    return { lines:[`${paren(rb.code)}.MovePosition(${p.code});`], illegal: rb.illegal||p.illegal||localCtx.illegal };
  }
  if (t==="rb_moverot") {
    const rb=V("RB"), q=V("Q");
    return { lines:[`${paren(rb.code)}.MoveRotation(${q.code});`], illegal: rb.illegal||q.illegal||localCtx.illegal };
  }

  if (t.startsWith("rb_set_")) {
    const rb=V("RB");
    let prop="", rhs;
    if (t==="rb_set_useGravity") { prop="useGravity"; rhs=V("B"); }
    else if (t==="rb_set_isKinematic") { prop="isKinematic"; rhs=V("B"); }
    else if (t==="rb_set_mass") { prop="mass"; rhs=V("M"); }
    else if (t==="rb_set_vel") { prop="velocity"; rhs=V("V"); }
    else { prop="angularVelocity"; rhs=V("V"); }
    return { lines:[`${paren(rb.code)}.${prop} = ${rhs.code};`], illegal: rb.illegal||rhs.illegal||localCtx.illegal };
  }

  // Physics.Raycast statement with optional receivers
    // Physics.Raycast statement with optional receivers
  if (t==="physics_raycast") {
    const o=V("O"), d=V("D"), dist=V("DIST");
    const outName = String(block.getFieldValue("OUTN") || "").trim();
    const hitName = String(block.getFieldValue("HITN") || "").trim();
    const hitOut = hitName ? hitName : "_";
    const call = `Physics.Raycast(${o.code}, ${d.code}, out ${hitOut}, ${dist.code})`;
    if (outName) return { lines:[`${outName} = ${call};`], illegal: o.illegal||d.illegal||dist.illegal||localCtx.illegal };
    return { lines:[`${call};`], illegal: o.illegal||d.illegal||dist.illegal||localCtx.illegal };
  }


  // GetComponent statement with optional receiver
    // GetComponent statement with optional receiver
  if (t==="go_getcomponent") {
    const outName = String(block.getFieldValue("OUTN") || "").trim();
    const ct = block.getFieldValue("CT");
    const go = V("GO");
    const call = `${paren(go.code)}.GetComponent<${ct}>()`;
    if (outName) return { lines:[`${outName} = ${call};`], illegal: go.illegal||localCtx.illegal };
    return { lines:[`${call};`], illegal: go.illegal||localCtx.illegal };
  }


  // Animator statements
  if (t==="anim_setFloat") { const a=V("A"); const k=block.getFieldValue("K"); const v=V("V"); return { lines:[`${paren(a.code)}.SetFloat("${escapeStr(k)}", ${v.code});`], illegal:a.illegal||v.illegal||localCtx.illegal }; }
  if (t==="anim_setBool") { const a=V("A"); const k=block.getFieldValue("K"); const v=V("V"); return { lines:[`${paren(a.code)}.SetBool("${escapeStr(k)}", ${v.code});`], illegal:a.illegal||v.illegal||localCtx.illegal }; }
  if (t==="anim_setTrigger") { const a=V("A"); const k=block.getFieldValue("K"); return { lines:[`${paren(a.code)}.SetTrigger("${escapeStr(k)}");`], illegal:a.illegal||localCtx.illegal }; }
  if (t==="anim_resetTrigger") { const a=V("A"); const k=block.getFieldValue("K"); return { lines:[`${paren(a.code)}.ResetTrigger("${escapeStr(k)}");`], illegal:a.illegal||localCtx.illegal }; }
  if (t==="anim_play") { const a=V("A"); const s=block.getFieldValue("S"); return { lines:[`${paren(a.code)}.Play("${escapeStr(s)}");`], illegal:a.illegal||localCtx.illegal }; }
  if (t==="anim_set_speed") { const a=V("A"); const v=V("V"); return { lines:[`${paren(a.code)}.speed = ${v.code};`], illegal:a.illegal||v.illegal||localCtx.illegal }; }

  // Audio statements
  if (t==="aud_play") { const s=V("S"); return { lines:[`${paren(s.code)}.Play();`], illegal:s.illegal||localCtx.illegal }; }
  if (t==="aud_stop") { const s=V("S"); return { lines:[`${paren(s.code)}.Stop();`], illegal:s.illegal||localCtx.illegal }; }
  if (t==="aud_pause") { const s=V("S"); return { lines:[`${paren(s.code)}.Pause();`], illegal:s.illegal||localCtx.illegal }; }
  if (t==="aud_playoneshot") { const s=V("S"); const c=V("C"); return { lines:[`${paren(s.code)}.PlayOneShot(${c.code});`], illegal:s.illegal||c.illegal||localCtx.illegal }; }
  if (t==="aud_set_volume") { const s=V("S"); const v=V("V"); return { lines:[`${paren(s.code)}.volume = ${v.code};`], illegal:s.illegal||v.illegal||localCtx.illegal }; }
  if (t==="aud_set_pitch") { const s=V("S"); const v=V("V"); return { lines:[`${paren(s.code)}.pitch = ${v.code};`], illegal:s.illegal||v.illegal||localCtx.illegal }; }
  if (t==="aud_set_loop") { const s=V("S"); const b=V("B"); return { lines:[`${paren(s.code)}.loop = ${b.code};`], illegal:s.illegal||b.illegal||localCtx.illegal }; }

  // Scene
  if (t==="scene_load") { const n=V("N"); return { lines:[`SceneManager.LoadScene(${n.code});`], illegal:n.illegal||localCtx.illegal }; }

  // Instantiate
    // Instantiate
  if (t==="unity_instantiate") {
    const outName = String(block.getFieldValue("OUTN") || "").trim();
    const prefab=V("PREFAB"), pos=V("POS"), rot=V("ROT");
    const call = `Instantiate(${prefab.code}, ${pos.code}, ${rot.code})`;
    if (outName) return { lines:[`${outName} = ${call};`], illegal:prefab.illegal||pos.illegal||rot.illegal||localCtx.illegal };
    return { lines:[`${call};`], illegal:prefab.illegal||pos.illegal||rot.illegal||localCtx.illegal };
  }


  // Destroy
  if (t==="unity_destroy") {
    // Destroy(object, delaySeconds)
    const tt = V("T");
    const o = V("O");
    return {
      lines:[`Destroy(${o.code}, ${tt.code});`],
      illegal:o.illegal||tt.illegal||localCtx.illegal
    };
  }

  // Debug
  if (t==="dbg_log") { const s=V("S"); return { lines:[`Debug.Log(${s.code});`], illegal:s.illegal||localCtx.illegal }; }
  if (t==="dbg_ray") { const o=V("O"), d=V("D"), l=V("L"); return { lines:[`Debug.DrawRay(${o.code}, ${paren(d.code)} * ${l.code});`], illegal:o.illegal||d.illegal||l.illegal||localCtx.illegal }; }

  // UI
  if (t==="tmp_set_text") { const tt=V("T"), s=V("S"); return { lines:[`${paren(tt.code)}.text = ${s.code};`], illegal:tt.illegal||s.illegal||localCtx.illegal }; }
  if (t==="img_set_sprite") { const i=V("I"), s=V("S"); return { lines:[`${paren(i.code)}.sprite = ${s.code};`], illegal:i.illegal||s.illegal||localCtx.illegal }; }
  if (t==="btn_addlistener") {
    const b=V("B"); const fn=String(block.getFieldValue("FN")||"");
    // per latest decision: myButton.onClick.AddListener(PrintMessage);
    return { lines:[`${paren(b.code)}.onClick.AddListener(${fn});`], illegal:b.illegal||localCtx.illegal };
  }

  // List statements
  if (t==="list_add") {
    const listName = varFieldName(block.getField("L")) || "/* list */";
    const v=V("V");
    return { lines:[`${listName}.Add(${v.code});`], illegal:v.illegal||localCtx.illegal };
  }
  if (t==="list_insert") {
    const listName = varFieldName(block.getField("L")) || "/* list */";
    const i=V("I"), v=V("V");
    return { lines:[`${listName}.Insert(${i.code}, ${v.code});`], illegal:i.illegal||v.illegal||localCtx.illegal };
  }
  if (t==="list_remove") {
    const listName = varFieldName(block.getField("L")) || "/* list */";
    const v=V("V");
    return { lines:[`${listName}.Remove(${v.code});`], illegal:v.illegal||localCtx.illegal };
  }
  if (t==="list_removeat") {
    const listName = varFieldName(block.getField("L")) || "/* list */";
    const i=V("I");
    return { lines:[`${listName}.RemoveAt(${i.code});`], illegal:i.illegal||localCtx.illegal };
  }
  if (t==="list_clear") {
    const listName = varFieldName(block.getField("L")) || "/* list */";
    return { lines:[`${listName}.Clear();`], illegal:false };
  }
  if (t==="list_set") {
    const listName = varFieldName(block.getField("L")) || "/* list */";
    const i=V("I"), v=V("V");
    return { lines:[`${listName}[${i.code}] = ${v.code};`], illegal:i.illegal||v.illegal||localCtx.illegal };
  }

  // Procedure call statement
  if (t.startsWith("proc_call_stmt_")) {
    const procId = t.slice("proc_call_stmt_".length);
    return procCallStmt(procId, block, localCtx);
  }

  // Fallback
  return { lines:[`/* unknown statement: ${t} */`], illegal:false };
}

function procCallArgs(block, ctx) {
  const args = [];
  let illegal = false;
  // inputs are named A0..A5
  for (let i = 0; i < 6; i++) {
    const input = block.getInput(`A${i}`);
    if (!input) break;
    const v = valueCode(block, `A${i}`, ctx);
    args.push(v.code);
    illegal ||= v.illegal;
  }
  return { args, illegal };
}

function procCallExpr(procId, block, ctx) {
  const { args, illegal } = procCallArgs(block, ctx);
  const name = block.getFieldValue("NAME") || `Proc_${procId}`;
  return { code: `${name}(${args.join(", ")})`, illegal: illegal || ctx.illegal };
}

function procCallStmt(procId, block, ctx) {
  const name = block.getFieldValue("NAME") || `Proc_${procId}`;
  const { args, illegal } = procCallArgs(block, ctx);
  const outName = String(block.getFieldValue("OUTN") || "").trim();
  if (outName) return { lines:[`${outName} = ${name}(${args.join(", ")});`], illegal };
  return { lines:[`${name}(${args.join(", ")});`], illegal };
}

function statementsFromInput(block, inputName, ctx) {
  const first = block.getInputTargetBlock(inputName);
  if (!first) return [];
  return statementChain(first, ctx);
}

function commentOut(lines, reason) {
  const out = [];
  if (reason) out.push(`// ${reason}`);
  for (const l of lines) out.push(`// ${l}`);
  return out;
}

function escapeStr(s) {
  return String(s ?? "").replace(/\\/g,"\\\\").replace(/"/g,'\\"');
}

function statementChain(first, ctx) {
  const lines = [];
  let b = first;
  while (b) {
    const st = statement(b, ctx);
    const illegal = st.illegal || ctx.illegal;
    if (illegal) {
      // Per decision: comment-out "line unit". If it's a multi-line (e.g., if), comment-out whole block.
      const reason = "scope-out: generated as comment";
      lines.push(...commentOut(st.lines, reason));
    } else {
      lines.push(...st.lines);
    }
    b = b.getNextBlock();
  }
  return lines;
}

function collectTopBlocksByType(workspace) {
  const tops = workspace.getTopBlocks(true);
  const by = new Map();
  for (const b of tops) {
    const arr = by.get(b.type) || [];
    arr.push(b);
    by.set(b.type, arr);
  }
  return by;
}

function genEventBody(workspace, evtType, ctx) {
  const tops = workspace.getTopBlocks(true).filter(b => b.type === evtType);
  const out = [];
  for (const top of tops) {
    // event blocks are hat-like with nextStatement chain.
    const next = top.getNextBlock();
    if (!next) continue;
    out.push(...statementChain(next, ctx));
  }
  return out;
}

function genProcBody(defBlock, procId) {
  const next = defBlock.getInputTargetBlock("DO");
  if (!next) return [];
  const ctx = { scope:"proc", procId, eventParam:null, illegal:false };
  return statementChain(next, ctx);
}

export function generateCSharp(workspace, registry) {
  const className = registry.className || "MyScript";

  // Gather global variables (public only). Always output all, per decision.
  const vars = workspace.getAllVariables();
  const fieldLines = [];
  for (const v of vars) {
    const csT = csTypeOfBlocklyType(v.type);
    if (v.type.startsWith("List_")) {
      // Per decision: List fields are initialized safely.
      fieldLines.push(`public ${csT} ${v.name} = new ${csT}();`);
    } else {
      fieldLines.push(`public ${csT} ${v.name};`);
    }
  }

  // Gather procedures from registry
  const procMethods = [];
  for (const proc of registry.getProcedures()) {
    const defType = `proc_def_${proc.id}`;
    const defs = workspace.getTopBlocks(true).filter(b => b.type === defType);
    if (defs.length === 0) continue;

    const argsSig = proc.args.map(a => `${csTypeOfBlocklyType(a.type)} ${a.name}`).join(", ");
    const ret = csTypeOfBlocklyType(proc.returnType);

    // Use the first def block for body; duplicates are ignored.
    const bodyLines = genProcBody(defs[0], proc.id);
    if (proc.returnType !== "void" && bodyLines.every(l => !l.trim().startsWith("return "))) {
      // Ensure compilable if user forgot return; user responsibility, but we keep minimal safe default.
      bodyLines.push(`return default(${ret});`);
    }
    procMethods.push("");
    procMethods.push(`public ${ret} ${proc.name}(${argsSig}) {`);
    procMethods.push(...indentLines(bodyLines, 1));
    procMethods.push("}");
  }

  // Events: generate bodies by concatenating blocks of same event type, in top-block order.
  const evtBodies = {
    Start: genEventBody(workspace, "evt_start", { scope:"event", eventParam:null, illegal:false }),
    Update: genEventBody(workspace, "evt_update", { scope:"event", eventParam:null, illegal:false }),
    OnCollisionEnter: genEventBody(workspace, "evt_collision_enter", { scope:"event", eventParam:"collision", illegal:false }),
    OnCollisionStay: genEventBody(workspace, "evt_collision_stay", { scope:"event", eventParam:"collision", illegal:false }),
    OnCollisionExit: genEventBody(workspace, "evt_collision_exit", { scope:"event", eventParam:"collision", illegal:false }),
    OnTriggerEnter: genEventBody(workspace, "evt_trigger_enter", { scope:"event", eventParam:"other", illegal:false }),
    OnTriggerStay: genEventBody(workspace, "evt_trigger_stay", { scope:"event", eventParam:"other", illegal:false }),
    OnTriggerExit: genEventBody(workspace, "evt_trigger_exit", { scope:"event", eventParam:"other", illegal:false }),
  };

  const eventMethods = [];
  // Always output Start/Update stubs (empty allowed).
  eventMethods.push("");
  eventMethods.push("void Start() {");
  eventMethods.push(...indentLines(evtBodies.Start, 1));
  eventMethods.push("}");
  eventMethods.push("");
  eventMethods.push("void Update() {");
  eventMethods.push(...indentLines(evtBodies.Update, 1));
  eventMethods.push("}");

  // Collision/Trigger only if blocks exist
  const has = (t) => workspace.getTopBlocks(true).some(b => b.type === t);

  if (has("evt_collision_enter")) {
    eventMethods.push("");
    eventMethods.push("void OnCollisionEnter(Collision collision) {");
    eventMethods.push(...indentLines(evtBodies.OnCollisionEnter, 1));
    eventMethods.push("}");
  }
  if (has("evt_collision_stay")) {
    eventMethods.push("");
    eventMethods.push("void OnCollisionStay(Collision collision) {");
    eventMethods.push(...indentLines(evtBodies.OnCollisionStay, 1));
    eventMethods.push("}");
  }
  if (has("evt_collision_exit")) {
    eventMethods.push("");
    eventMethods.push("void OnCollisionExit(Collision collision) {");
    eventMethods.push(...indentLines(evtBodies.OnCollisionExit, 1));
    eventMethods.push("}");
  }
  if (has("evt_trigger_enter")) {
    eventMethods.push("");
    eventMethods.push("void OnTriggerEnter(Collider other) {");
    eventMethods.push(...indentLines(evtBodies.OnTriggerEnter, 1));
    eventMethods.push("}");
  }
  if (has("evt_trigger_stay")) {
    eventMethods.push("");
    eventMethods.push("void OnTriggerStay(Collider other) {");
    eventMethods.push(...indentLines(evtBodies.OnTriggerStay, 1));
    eventMethods.push("}");
  }
  if (has("evt_trigger_exit")) {
    eventMethods.push("");
    eventMethods.push("void OnTriggerExit(Collider other) {");
    eventMethods.push(...indentLines(evtBodies.OnTriggerExit, 1));
    eventMethods.push("}");
  }

  // Using directives: always output all, unused is acceptable. 
  const lines = [];
  lines.push("using System.Collections;");
  lines.push("using System.Collections.Generic;");
  lines.push("using UnityEngine;");
  lines.push("using UnityEngine.SceneManagement;");
  lines.push("using UnityEngine.UI;");
  lines.push("using TMPro;");
  lines.push("");
  lines.push(`public class ${className} : MonoBehaviour {`);
  if (fieldLines.length) {
    lines.push(...indentLines(fieldLines, 1));
  }
  lines.push(...indentLines(procMethods, 1));
  lines.push(...indentLines(eventMethods, 1));
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}
