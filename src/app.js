// src/app.js
/* global Blockly */
import { defineAllBlocks, registerProcedureBlocks } from "./blocks.js";
import { ALL_VAR_TYPES, BASE_TYPES, LIST_TYPES, validateNameStrict, BANNED_IDENTIFIERS } from "./config.js";
import { generateCSharp } from "./csharp_gen.js";

/**
 * Minimal class-count, minimal dependency approach:
 * - App orchestrates workspace + panels.
 * - Registry holds only "extra" metadata (procedures + className).
 */

class Registry {
  constructor() {
    this.className = "MyScript";
    /** @type {Map<string, {id:string,name:string,returnType:string,args:Array<{name:string,type:string}>}>} */
    this.procs = new Map();
  }
  setClassName(name) { this.className = name; }
  addProc(proc) { this.procs.set(proc.id, proc); }
  delProc(id) { this.procs.delete(id); }
  getProc(id) { return this.procs.get(id); }
  getProcedures() { return Array.from(this.procs.values()); }
}

/** JSON wrapper (adopted) */
function exportState(workspace, registry) {
  const ws = Blockly.serialization.workspaces.save(workspace);
  return {
    version: 1,
    className: registry.className,
    procedures: registry.getProcedures(),
    workspace: ws,
  };
}
function importState(obj, workspace, registry) {
  if (!obj || typeof obj !== "object") throw new Error("invalid JSON");
  // 1) restore registry meta first
  registry.setClassName(String(obj.className || "MyScript"));
  registry.procs.clear();

  // 2) register dynamic procedure block types BEFORE loading workspace
  const procs = Array.isArray(obj.procedures) ? obj.procedures : [];
  for (const p of procs) {
    if (!p || !p.id) continue;
    registry.addProc(p);
    registerProcedureBlocks(p);
  }

  // 3) load workspace
  workspace.clear();
  if (obj.workspace) {
    Blockly.serialization.workspaces.load(obj.workspace, workspace);
  }
}

function listVariables(workspace) {
  return workspace.getAllVariables().slice().sort((a,b)=>a.name.localeCompare(b.name));
}

function isNameBanned(name) {
  return BANNED_IDENTIFIERS.has(name);
}

function nameCollides(name, workspace, registry) {
  // variable collision
  for (const v of workspace.getAllVariables()) {
    if (v.name === name) return { ok:false, reason:"var_collision" };
  }
  // procedure collision
  for (const p of registry.getProcedures()) {
    if (p.name === name) return { ok:false, reason:"proc_collision" };
  }
  // banned words / API names / etc
  if (isNameBanned(name)) return { ok:false, reason:"banned" };
  return { ok:true };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function buildToolboxJson(registry) {
  const cat = (name, colour, contents) => ({ kind:"category", name, colour, contents });

  const block = (type, extra={}) => Object.assign({ kind:"block", type }, extra);

  // Procedures: call blocks are dynamic types (proc_call_*)
  const procBlocks = [];
  for (const p of registry.getProcedures()) {
    procBlocks.push(block(`proc_call_stmt_${p.id}`));
    if (p.returnType !== "void") procBlocks.push(block(`proc_call_val_${p.id}`));
    // arg ref blocks are NOT placed in toolbox (they are typically dragged from definition area),
    // but keeping them in a hidden subcategory can be useful; for now we omit to keep toolbox simpler.
  }

  const toolbox = {
    kind: "categoryToolbox",
    contents: [
      cat("イベント", 20, [
        block("evt_start"),
        block("evt_update"),
        block("evt_collision_enter"),
        block("evt_collision_stay"),
        block("evt_collision_exit"),
        block("evt_trigger_enter"),
        block("evt_trigger_stay"),
        block("evt_trigger_exit"),
      ]),
      cat("制御", 120, [
        block("ctrl_if"),
        block("ctrl_if_else"),
        block("ctrl_repeat"),
        block("ctrl_while"),
        block("ctrl_break"),
      ]),
      cat("変数", 330, [
        block("var_get"),
        block("var_set"),
      ]),
      cat("List", 290, [
        block("list_add"),
        block("list_insert"),
        block("list_remove"),
        block("list_removeat"),
        block("list_clear"),
        block("list_contains"),
        block("list_indexof"),
        block("list_count"),
        block("list_get"),
        block("list_set"),
      ]),
      cat("Math/比較/論理", 230, [
        block("const_int"),
        block("const_float"),
        block("const_bool"),
        block("const_string"),
        block("cast_int_to_float"),
        block("cast_float_to_int"),
        block("arith_int"),
        block("arith_float"),
        block("cmp_int"),
        block("cmp_float"),
        block("eq_bool"),
        block("eq_string"),
        block("logic_and"),
        block("logic_or"),
        block("logic_not"),
        block("mathf_abs"),
        block("mathf_clamp"),
        block("mathf_clamp01"),
        block("mathf_min"),
        block("mathf_max"),
        block("mathf_lerp"),
        block("mathf_sqrt"),
      ]),
      cat("Vector/Quaternion/Color", 200, [
        block("make_vector2"),
        block("make_vector3"),
        block("quat_euler"),
        block("color_rgba"),
        block("vec3_zero"),
        block("quat_identity"),
        block("color_white"),
        block("color_black"),
        block("vec3_add"),
        block("vec3_sub"),
        block("vec3_mul"),
        block("vec3_div"),
        block("vec3_magnitude"),
        block("vec3_normalized"),
        block("vec3_distance"),
        block("vec3_dot"),
        block("vec3_cross"),
      ]),
      cat("Input", 160, [
        block("input_getkey"),
        block("input_getmouse"),
        block("input_getaxis"),
        block("input_mousepos"),
      ]),
      cat("GameObject / Component", 160, [
        block("go_get_transform"),
        block("tr_get_gameobject"),
        block("go_getcomponent"),
      ]),
      cat("Transform", 160, [
        block("tr_pos"), block("tr_lpos"), block("tr_rot"), block("tr_lrot"),
        block("tr_euler"), block("tr_leuler"), block("tr_forward"), block("tr_right"), block("tr_up"),
        block("tr_set_pos"), block("tr_set_lpos"), block("tr_set_rot"), block("tr_set_lrot"),
        block("tr_set_euler"), block("tr_set_leuler"),
        block("tr_translate"), block("tr_rotate"),
        block("tr_lookat_tr"), block("tr_lookat_v3"),
      ]),
      cat("Rigidbody", 160, [
        block("rb_addforce"),
        block("rb_addtorque"),
        block("rb_movepos"),
        block("rb_moverot"),
        block("rb_get_useGravity"),
        block("rb_set_useGravity"),
        block("rb_get_isKinematic"),
        block("rb_set_isKinematic"),
        block("rb_get_mass"),
        block("rb_set_mass"),
        block("rb_get_vel"),
        block("rb_set_vel"),
        block("rb_get_angvel"),
        block("rb_set_angvel"),
      ]),
      cat("Physics", 10, [
        block("physics_raycast"),
        block("hit_point"),
        block("hit_normal"),
        block("hit_distance"),
        block("hit_collider"),
        block("hit_transform"),
        block("col_get_go"),
        block("col_get_tr"),
        block("collision_get_collider"),
        block("collision_get_go"),
        block("collision_get_tr"),
        block("other_get"),
        block("other_get_go"),
        block("other_get_tr"),
      ]),
      cat("Animation", 300, [
        block("anim_setFloat"),
        block("anim_setBool"),
        block("anim_setTrigger"),
        block("anim_resetTrigger"),
        block("anim_play"),
        block("anim_set_speed"),
        block("anim_get_speed"),
      ]),
      cat("Audio", 60, [
        block("aud_play"),
        block("aud_playoneshot"),
        block("aud_stop"),
        block("aud_pause"),
        block("aud_set_volume"),
        block("aud_get_volume"),
        block("aud_set_pitch"),
        block("aud_get_pitch"),
        block("aud_set_loop"),
        block("aud_get_loop"),
      ]),
      cat("UI", 40, [
        block("tmp_get_text"),
        block("tmp_set_text"),
        block("img_set_sprite"),
        block("btn_addlistener"),
      ]),
      cat("Scene", 90, [
        block("scene_load"),
      ]),
      cat("Instantiate / Destroy", 160, [
        block("unity_instantiate"),
        block("unity_destroy"),
      ]),
      cat("Debug", 0, [
        block("dbg_log"),
        block("dbg_ray"),
      ]),
      cat("Time", 180, [
        block("time_deltaTime"),
        block("time_time"),
      ]),
      cat("関数", 260, [
        ...procBlocks,
      ]),
    ]
  };
  return toolbox;
}

function refreshPickers(workspace, registry, els) {
  // Variables picker
  const vars = listVariables(workspace);
  els.varPick.innerHTML = "";
  for (const v of vars) {
    const opt = document.createElement("option");
    opt.value = v.getId();
    opt.textContent = `${v.name} : ${v.type}`;
    els.varPick.appendChild(opt);
  }

  // Procedures picker
  els.procPick.innerHTML = "";
  for (const p of registry.getProcedures()) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} : ${p.returnType} (${p.args.map(a=>a.type).join(", ")})`;
    els.procPick.appendChild(opt);
  }
}

function setupProcArgUI(els) {
  const count = Number(els.procArgCount.value || 0);
  els.procArgs.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "argRow";
    const nameLabel = document.createElement("label");
    nameLabel.textContent = `引数${i+1} 名`;
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = `arg${i+1}`;
    nameInput.dataset.argIndex = String(i);
    nameInput.className = "argName";

    const typeLabel = document.createElement("label");
    typeLabel.textContent = `引数${i+1} 型`;
    const typeSel = document.createElement("select");
    typeSel.className = "argType";
    typeSel.dataset.argIndex = String(i);
    for (const t of BASE_TYPES) {
      const opt = document.createElement("option");
      opt.value = t; opt.textContent = t;
      typeSel.appendChild(opt);
    }

    const wrap1 = document.createElement("label"); wrap1.appendChild(nameLabel); wrap1.appendChild(nameInput);
    const wrap2 = document.createElement("label"); wrap2.appendChild(typeLabel); wrap2.appendChild(typeSel);
    row.appendChild(wrap1);
    row.appendChild(wrap2);
    els.procArgs.appendChild(row);
  }
}

function focusBlock(workspace, blockType) {
  const blocks = workspace.getTopBlocks(true).filter(b => b.type === blockType);
  if (!blocks.length) return;
  const b = blocks[0];
  workspace.centerOnBlock(b.id);
  b.select();
}

function main() {
  // Define base blocks
  defineAllBlocks();

  const registry = new Registry();

  // Elements
  const els = {
    className: document.getElementById("className"),
    btnRegen: document.getElementById("btnRegen"),
    codeOut: document.getElementById("codeOut"),

    varName: document.getElementById("varName"),
    varType: document.getElementById("varType"),
    btnAddVar: document.getElementById("btnAddVar"),
    btnDelVar: document.getElementById("btnDelVar"),
    varPick: document.getElementById("varPick"),

    procName: document.getElementById("procName"),
    procRet: document.getElementById("procRet"),
    procArgCount: document.getElementById("procArgCount"),
    procArgs: document.getElementById("procArgs"),
    btnAddProc: document.getElementById("btnAddProc"),
    btnDelProc: document.getElementById("btnDelProc"),
    procPick: document.getElementById("procPick"),
    btnFocusProc: document.getElementById("btnFocusProc"),

    btnSave: document.getElementById("btnSave"),
    btnLoad: document.getElementById("btnLoad"),
    stateJson: document.getElementById("stateJson"),
  };

  // Populate type dropdowns
  for (const t of ALL_VAR_TYPES) {
    const opt = document.createElement("option");
    opt.value = t; opt.textContent = t;
    els.varType.appendChild(opt);
  }

  for (const t of ["void", ...BASE_TYPES]) {
    const opt = document.createElement("option");
    opt.value = t; opt.textContent = t;
    els.procRet.appendChild(opt);
  }

  for (let i = 0; i <= 6; i++) {
    const opt = document.createElement("option");
    opt.value = String(i); opt.textContent = String(i);
    els.procArgCount.appendChild(opt);
  }
  els.procArgCount.value = "0";

  setupProcArgUI(els);
  els.procArgCount.addEventListener("change", () => setupProcArgUI(els));

  // Workspace
  const toolbox = buildToolboxJson(registry);
  const workspace = Blockly.inject("blocklyDiv", {
    toolbox,
    trashcan: true,
    // Typed variables: avoid invalid default type "" by defining allowed types + default.
    variableTypes: ALL_VAR_TYPES,
    defaultVariableType: BASE_TYPES[0],
    zoom: { controls: true, wheel: true },
    grid: { spacing: 20, length: 3, colour: "#ddd", snap: true },
  });

  // Re-render toolbox when procs change
  function updateToolbox() {
    workspace.updateToolbox(buildToolboxJson(registry));
  }

  // Code generation
  function regen() {
    registry.setClassName(els.className.value || "MyScript");
    els.codeOut.textContent = generateCSharp(workspace, registry);
    refreshPickers(workspace, registry, els);
  }

  // Live updates (you allowed "heavy behaviour" to be decided after running)
  workspace.addChangeListener(() => regen());
  els.btnRegen.addEventListener("click", () => regen());

  // -------- Variable create/delete --------
  els.btnAddVar.addEventListener("click", () => {
    const name = els.varName.value;
    const type = els.varType.value;

    const v1 = validateNameStrict(name);
    if (!v1.ok) { alert(`名前が不正です: ${v1.reason}`); return; }
    const c = nameCollides(name, workspace, registry);
    if (!c.ok) { alert(`名前が衝突しています: ${c.reason}`); return; }

    // Create as global var
    workspace.createVariable(name, type);
    els.varName.value = "";
    regen();
  });

  els.btnDelVar.addEventListener("click", () => {
    const id = els.varPick.value;
    if (!id) return;
    const v = workspace.getVariableById(id);
    if (!v) return;
    workspace.deleteVariableById(id);
    regen();
  });

  // -------- Procedure create/delete --------
  els.btnAddProc.addEventListener("click", () => {
    const name = els.procName.value;
    const ret = els.procRet.value;
    const v1 = validateNameStrict(name);
    if (!v1.ok) { alert(`関数名が不正です: ${v1.reason}`); return; }
    const c = nameCollides(name, workspace, registry);
    if (!c.ok) { alert(`関数名が衝突しています: ${c.reason}`); return; }

    const count = Number(els.procArgCount.value || 0);
    const argNames = Array.from(document.querySelectorAll(".argName")).map(el => el.value);
    const argTypes = Array.from(document.querySelectorAll(".argType")).map(el => el.value);

    const args = [];
    for (let i = 0; i < count; i++) {
      const an = argNames[i] ?? "";
      const at = argTypes[i] ?? "int";
      const vv = validateNameStrict(an);
      if (!vv.ok) { alert(`引数名が不正です: ${vv.reason}`); return; }
      // arg name collision with banned is also checked (you requested wide collision checks)
      if (isNameBanned(an)) { alert(`引数名が禁止リストに含まれます: ${an}`); return; }
      args.push({ name: an, type: at });
    }

    const proc = { id: uid(), name, returnType: ret, args };
    registry.addProc(proc);
    registerProcedureBlocks(proc);
    updateToolbox();

    // Create definition block in workspace (Scratch-like)
    const defType = `proc_def_${proc.id}`;
    const b = workspace.newBlock(defType);
    b.initSvg(); b.render();
    // Place near top-left
    b.moveBy(20, 20);
    b.setDeletable(true);

    // Also create arg reference blocks and place near definition for convenience
    for (let i = 0; i < proc.args.length; i++) {
      const ab = workspace.newBlock(`proc_arg_${proc.id}_${i}`);
      ab.initSvg(); ab.render();
      ab.moveBy(40, 60 + i * 30);
      ab.setDeletable(true);
    }

    els.procName.value = "";
    regen();
  });

  els.btnDelProc.addEventListener("click", () => {
    const id = els.procPick.value;
    if (!id) return;

    // Delete all blocks of this procedure types from workspace
    const types = [`proc_def_${id}`, `proc_call_stmt_${id}`, `proc_call_val_${id}`];
    for (const b of workspace.getAllBlocks(false)) {
      if (types.includes(b.type) || b.type.startsWith(`proc_arg_${id}_`)) {
        b.dispose(true);
      }
    }
    registry.delProc(id);
    updateToolbox();
    regen();
  });

  els.btnFocusProc.addEventListener("click", () => {
    const id = els.procPick.value;
    if (!id) return;
    focusBlock(workspace, `proc_def_${id}`);
  });

  // -------- Save/Load --------
  els.btnSave.addEventListener("click", () => {
    const state = exportState(workspace, registry);
    els.stateJson.value = JSON.stringify(state, null, 2);
  });

  els.btnLoad.addEventListener("click", () => {
    try {
      const obj = JSON.parse(els.stateJson.value || "{}");
      importState(obj, workspace, registry);
      els.className.value = registry.className;
      updateToolbox();
      regen();
    } catch (e) {
      alert(`読込に失敗: ${e.message}`);
    }
  });

  // Initial regen
  regen();
}

main();
