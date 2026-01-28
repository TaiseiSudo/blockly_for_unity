// src/blocks.js
/* global Blockly */
import { CAT_COLOR, BASE_TYPES, LIST_TYPES, COMPONENT_TYPES, ALL_VAR_TYPES, listTypeToElementType } from "./config.js";


// -------- Tooltip: show return type + argument socket types --------
// Tooltip format: "ReturnType (Arg1, Arg2, ...)" where args are derived from input socket checks.
function _argTypeFromInput(input) {
  const chk = input?.connection?.getCheck ? input.connection.getCheck() : (input?.connection?.check_ ?? null);
  if (!chk || !chk.length) return "any";
  return chk.join("|");
}
function _returnTypeFromBlock(block) {
  if (block.outputConnection) {
    const chk = block.outputConnection.getCheck ? block.outputConnection.getCheck() : (block.outputConnection.check_ ?? null);
    if (!chk || !chk.length) return "any";
    return chk.join("|");
  }
  return "void";
}
function _tooltipForBlock(block) {
  const ret = _returnTypeFromBlock(block);
  const args = [];
  for (const inp of block.inputList || []) {
    if (inp.type === Blockly.INPUT_VALUE) args.push(_argTypeFromInput(inp));
  }
  return args.length ? `${ret} (${args.join(", ")})` : ret;
}

// -------- Inline layout + default ctor shadows (Vector2/Vector3/Color) --------
function _makeConstFloatShadowDom(value) {
  const shadow = Blockly.utils.xml.createElement("shadow");
  shadow.setAttribute("type", "const_float");
  const f = Blockly.utils.xml.createElement("field");
  f.setAttribute("name", "N"); // const_float uses field name "N"
  f.textContent = String(value);
  shadow.appendChild(f);
  return shadow;
}
function _ensureFloatShadow(block, inputName, value) {
  const inp = block.getInput ? block.getInput(inputName) : null;
  if (!inp || !inp.connection) return;
  if (inp.connection.targetBlock && inp.connection.targetBlock()) return; // already connected
  inp.connection.setShadowDom(_makeConstFloatShadowDom(value));
}
function _applyCtorDefaultShadows(block) {
  // Only apply to numeric->struct constructor blocks to avoid changing "empty socket" policy elsewhere.
  switch (block.type) {
    case "make_vector2":
      _ensureFloatShadow(block, "X", 0);
      _ensureFloatShadow(block, "Y", 0);
      break;
    case "make_vector3":
      _ensureFloatShadow(block, "X", 0);
      _ensureFloatShadow(block, "Y", 0);
      _ensureFloatShadow(block, "Z", 0);
      break;
    case "color_rgba":
      _ensureFloatShadow(block, "R", 1);
      _ensureFloatShadow(block, "G", 1);
      _ensureFloatShadow(block, "B", 1);
      _ensureFloatShadow(block, "A", 1);
      break;
    default:
      break;
  }
}

function _patchAllTooltips() {
  for (const type of Object.keys(Blockly.Blocks)) {
    const def = Blockly.Blocks[type];
    if (!def || def.__autoTipPatched) continue;
    const oldInit = def.init;
    if (typeof oldInit !== "function") continue;
    def.init = function() {
      oldInit.call(this);

      // 1) Multiple value-input blocks: inline (Scratch-like horizontal arguments)
      const valueCount = (this.inputList || []).filter(i => i.type === Blockly.INPUT_VALUE).length;
      if (valueCount >= 2) this.setInputsInline(true);

      // 2) Default ctor values (Vector2/Vector3/Color only)
      _applyCtorDefaultShadows(this);

      // 3) Tooltip shows return + arg socket types
      this.setTooltip(() => _tooltipForBlock(this));
    };
    def.__autoTipPatched = true;
  }
}


/**
 * Notes:
 * - All blocks are defined via Block JSON, per decision.
 * - Category-based colours (NOT type-based), per decision.
 * - Tooltip content is "type name only".
 */

export function defineAllBlocks() {
  Blockly.defineBlocksWithJsonArray([
    // ----------------------------
    // Events (Hat blocks)
    // ----------------------------
    {
      type: "evt_start",
      message0: "スタート",
      nextStatement: null,
      colour: CAT_COLOR.events,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "evt_update",
      message0: "ずっと",
      nextStatement: null,
      colour: CAT_COLOR.events,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "evt_collision_enter",
      message0: "衝突したとき (Enter)  collision",
      nextStatement: null,
      colour: CAT_COLOR.events,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "evt_collision_stay",
      message0: "衝突している間 (Stay)  collision",
      nextStatement: null,
      colour: CAT_COLOR.events,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "evt_collision_exit",
      message0: "衝突し終わったとき (Exit)  collision",
      nextStatement: null,
      colour: CAT_COLOR.events,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "evt_trigger_enter",
      message0: "すり抜けたとき (Enter)  other",
      nextStatement: null,
      colour: CAT_COLOR.events,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "evt_trigger_stay",
      message0: "すり抜けている間 (Stay)  other",
      nextStatement: null,
      colour: CAT_COLOR.events,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "evt_trigger_exit",
      message0: "すり抜け終わったとき (Exit)  other",
      nextStatement: null,
      colour: CAT_COLOR.events,
      tooltip: "void",
      helpUrl: ""
    },

    // ----------------------------
    // Control
    // ----------------------------
    {
      type: "ctrl_if",
      message0: "もし %1 なら %2",
      args0: [
        { type: "input_value", name: "COND", check: "bool" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT_COLOR.control,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "ctrl_if_else",
      message0: "もし %1 なら %2 でなければ %3",
      args0: [
        { type: "input_value", name: "COND", check: "bool" },
        { type: "input_statement", name: "DO" },
        { type: "input_statement", name: "ELSE" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT_COLOR.control,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "ctrl_repeat",
      message0: "%1 回繰り返す %2",
      args0: [
        { type: "input_value", name: "COUNT", check: "int" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT_COLOR.control,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "ctrl_while",
      message0: "%1 が正しい間繰り返す %2",
      args0: [
        { type: "input_value", name: "COND", check: "bool" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT_COLOR.control,
      tooltip: "void",
      helpUrl: ""
    },
    {
      type: "ctrl_break",
      message0: "繰り返しを抜ける",
      previousStatement: null,
      nextStatement: null,
      colour: CAT_COLOR.control,
      tooltip: "void",
      helpUrl: ""
    },

    // ----------------------------
    // Variables (dynamic typed)
    // ----------------------------
    {
      type: "var_get",
      message0: "%1",
      args0: [
        { type: "field_variable", name: "VAR", variable: "x", variableTypes: ALL_VAR_TYPES, defaultType: BASE_TYPES[0] }
      ],
      output: null,
      colour: CAT_COLOR.vars,
      tooltip: "", // set by extension (type name only)
      helpUrl: "",
      extensions: ["ext_var_get_typed"]
    },
    {
      type: "var_set",
      message0: "%1 を %2 にする",
      args0: [
        { type: "field_variable", name: "VAR", variable: "x", variableTypes: ALL_VAR_TYPES, defaultType: BASE_TYPES[0] },
        { type: "input_value", name: "VALUE" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT_COLOR.vars,
      tooltip: "void",
      helpUrl: "",
      extensions: ["ext_var_set_typed"]
    },

    // ----------------------------
    // Constants / literals
    // ----------------------------
    {
      type: "const_int",
      message0: "%1",
      args0: [
        { type: "field_number", name: "N", value: 0, precision: 1 }
      ],
      output: "int",
      colour: CAT_COLOR.math,
      tooltip: "int",
      helpUrl: ""
    },
    {
      type: "const_float",
      message0: "%1",
      args0: [
        { type: "field_number", name: "N", value: 0.0, precision: 0.01 }
      ],
      output: "float",
      colour: CAT_COLOR.math,
      tooltip: "float",
      helpUrl: ""
    },
    {
      type: "const_bool",
      message0: "%1",
      args0: [
        { type: "field_dropdown", name: "B", options: [["true","true"],["false","false"]] }
      ],
      output: "bool",
      colour: CAT_COLOR.math,
      tooltip: "bool",
      helpUrl: ""
    },
    {
      type: "const_string",
      message0: "「%1」",
      args0: [
        { type: "field_input", name: "S", text: "" }
      ],
      output: "string",
      colour: CAT_COLOR.math,
      tooltip: "string",
      helpUrl: ""
    },

    // ----------------------------
    // Casts (explicit only)
    // ----------------------------
    {
      type: "cast_int_to_float",
      message0: "(float) %1",
      args0: [
        { type: "input_value", name: "V", check: "int" }
      ],
      output: "float",
      colour: CAT_COLOR.math,
      tooltip: "float",
      helpUrl: ""
    },
    {
      type: "cast_float_to_int",
      message0: "(int) %1",
      args0: [
        { type: "input_value", name: "V", check: "float" }
      ],
      output: "int",
      colour: CAT_COLOR.math,
      tooltip: "int",
      helpUrl: ""
    },

    // ----------------------------
    // Arithmetic (int/float)
    // ----------------------------
    {
      type: "arith_int",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "int" },
        { type: "field_dropdown", name: "OP", options: [["＋","+"],["－","-"],["×","*"],["÷","/"]] },
        { type: "input_value", name: "B", check: "int" }
      ],
      output: "int",
      colour: CAT_COLOR.math,
      tooltip: "int",
      helpUrl: ""
    },
    {
      type: "arith_float",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "float" },
        { type: "field_dropdown", name: "OP", options: [["＋","+"],["－","-"],["×","*"],["÷","/"]] },
        { type: "input_value", name: "B", check: "float" }
      ],
      output: "float",
      colour: CAT_COLOR.math,
      tooltip: "float",
      helpUrl: ""
    },

    // ----------------------------
    // Compare / Logic
    // ----------------------------
    {
      type: "cmp_int",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "int" },
        { type: "field_dropdown", name: "OP", options: [["=","=="],["≠","!="],["<","<"],["≤","<="],[">",">"],["≥",">="]] },
        { type: "input_value", name: "B", check: "int" }
      ],
      output: "bool",
      colour: CAT_COLOR.math,
      tooltip: "bool",
      helpUrl: ""
    },
    {
      type: "cmp_float",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "float" },
        { type: "field_dropdown", name: "OP", options: [["=","=="],["≠","!="],["<","<"],["≤","<="],[">",">"],["≥",">="]] },
        { type: "input_value", name: "B", check: "float" }
      ],
      output: "bool",
      colour: CAT_COLOR.math,
      tooltip: "bool",
      helpUrl: ""
    },
    {
      type: "eq_bool",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "bool" },
        { type: "field_dropdown", name: "OP", options: [["=","=="],["≠","!="]] },
        { type: "input_value", name: "B", check: "bool" }
      ],
      output: "bool",
      colour: CAT_COLOR.math,
      tooltip: "bool",
      helpUrl: ""
    },
    {
      type: "eq_string",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "string" },
        { type: "field_dropdown", name: "OP", options: [["=","=="],["≠","!="]] },
        { type: "input_value", name: "B", check: "string" }
      ],
      output: "bool",
      colour: CAT_COLOR.math,
      tooltip: "bool",
      helpUrl: ""
    },
    {
      type: "logic_and",
      message0: "%1 かつ %2",
      args0: [
        { type: "input_value", name: "A", check: "bool" },
        { type: "input_value", name: "B", check: "bool" }
      ],
      output: "bool",
      colour: CAT_COLOR.math,
      tooltip: "bool",
      helpUrl: ""
    },
    {
      type: "logic_or",
      message0: "%1 または %2",
      args0: [
        { type: "input_value", name: "A", check: "bool" },
        { type: "input_value", name: "B", check: "bool" }
      ],
      output: "bool",
      colour: CAT_COLOR.math,
      tooltip: "bool",
      helpUrl: ""
    },
    {
      type: "logic_not",
      message0: "ではない %1",
      args0: [
        { type: "input_value", name: "A", check: "bool" }
      ],
      output: "bool",
      colour: CAT_COLOR.math,
      tooltip: "bool",
      helpUrl: ""
    },

    // ----------------------------
    // Mathf
    // ----------------------------
    { type:"mathf_abs", message0:"Abs %1", args0:[{type:"input_value",name:"X",check:"float"}], output:"float", colour:CAT_COLOR.math, tooltip:"float", helpUrl:"" },
    { type:"mathf_clamp", message0:"Clamp %1 最小 %2 最大 %3", args0:[{type:"input_value",name:"X",check:"float"},{type:"input_value",name:"MIN",check:"float"},{type:"input_value",name:"MAX",check:"float"}], output:"float", colour:CAT_COLOR.math, tooltip:"float", helpUrl:"" },
    { type:"mathf_clamp01", message0:"Clamp01 %1", args0:[{type:"input_value",name:"X",check:"float"}], output:"float", colour:CAT_COLOR.math, tooltip:"float", helpUrl:"" },
    { type:"mathf_min", message0:"Min %1 %2", args0:[{type:"input_value",name:"A",check:"float"},{type:"input_value",name:"B",check:"float"}], output:"float", colour:CAT_COLOR.math, tooltip:"float", helpUrl:"" },
    { type:"mathf_max", message0:"Max %1 %2", args0:[{type:"input_value",name:"A",check:"float"},{type:"input_value",name:"B",check:"float"}], output:"float", colour:CAT_COLOR.math, tooltip:"float", helpUrl:"" },
    { type:"mathf_lerp", message0:"Lerp %1 → %2 で %3", args0:[{type:"input_value",name:"A",check:"float"},{type:"input_value",name:"B",check:"float"},{type:"input_value",name:"T",check:"float"}], output:"float", colour:CAT_COLOR.math, tooltip:"float", helpUrl:"" },
    { type:"mathf_sqrt", message0:"Sqrt %1", args0:[{type:"input_value",name:"X",check:"float"}], output:"float", colour:CAT_COLOR.math, tooltip:"float", helpUrl:"" },

    // ----------------------------
    // Vector constructors & constants
    // ----------------------------
    {
      type: "make_vector2",
      message0: "Vector2 (%1 , %2)",
      args0: [
        { type: "input_value", name: "X", check: "float" },
        { type: "input_value", name: "Y", check: "float" }
      ],
      output: "Vector2",
      colour: CAT_COLOR.vector,
      tooltip: "Vector2",
      helpUrl: ""
    },
    {
      type: "make_vector3",
      message0: "Vector3 (%1 , %2 , %3)",
      args0: [
        { type: "input_value", name: "X", check: "float" },
        { type: "input_value", name: "Y", check: "float" },
        { type: "input_value", name: "Z", check: "float" }
      ],
      output: "Vector3",
      colour: CAT_COLOR.vector,
      tooltip: "Vector3",
      helpUrl: ""
    },
    {
      type: "quat_euler",
      message0: "Quaternion.Euler %1",
      args0: [
        { type: "input_value", name: "E", check: "Vector3" }
      ],
      output: "Quaternion",
      colour: CAT_COLOR.vector,
      tooltip: "Quaternion",
      helpUrl: ""
    },
    {
      type: "color_rgba",
      message0: "Color (%1 , %2 , %3 , %4)",
      args0: [
        { type: "input_value", name: "R", check: "float" },
        { type: "input_value", name: "G", check: "float" },
        { type: "input_value", name: "B", check: "float" },
        { type: "input_value", name: "A", check: "float" }
      ],
      output: "Color",
      colour: CAT_COLOR.vector,
      tooltip: "Color",
      helpUrl: ""
    },
    { type:"vec3_zero", message0:"Vector3.zero", output:"Vector3", colour:CAT_COLOR.vector, tooltip:"Vector3", helpUrl:"" },
    { type:"quat_identity", message0:"Quaternion.identity", output:"Quaternion", colour:CAT_COLOR.vector, tooltip:"Quaternion", helpUrl:"" },
    { type:"color_white", message0:"Color.white", output:"Color", colour:CAT_COLOR.vector, tooltip:"Color", helpUrl:"" },
    { type:"color_black", message0:"Color.black", output:"Color", colour:CAT_COLOR.vector, tooltip:"Color", helpUrl:"" },

    // Vector3 ops
    { type:"vec3_add", message0:"%1 + %2", args0:[{type:"input_value",name:"A",check:"Vector3"},{type:"input_value",name:"B",check:"Vector3"}], output:"Vector3", colour:CAT_COLOR.vector, tooltip:"Vector3", helpUrl:"" },
    { type:"vec3_sub", message0:"%1 - %2", args0:[{type:"input_value",name:"A",check:"Vector3"},{type:"input_value",name:"B",check:"Vector3"}], output:"Vector3", colour:CAT_COLOR.vector, tooltip:"Vector3", helpUrl:"" },
    { type:"vec3_mul", message0:"%1 × %2", args0:[{type:"input_value",name:"V",check:"Vector3"},{type:"input_value",name:"S",check:"float"}], output:"Vector3", colour:CAT_COLOR.vector, tooltip:"Vector3", helpUrl:"" },
    { type:"vec3_div", message0:"%1 ÷ %2", args0:[{type:"input_value",name:"V",check:"Vector3"},{type:"input_value",name:"S",check:"float"}], output:"Vector3", colour:CAT_COLOR.vector, tooltip:"Vector3", helpUrl:"" },
    { type:"vec3_magnitude", message0:"%1 の Magnitude", args0:[{type:"input_value",name:"V",check:"Vector3"}], output:"float", colour:CAT_COLOR.vector, tooltip:"float", helpUrl:"" },
    { type:"vec3_normalized", message0:"%1 の Normalized", args0:[{type:"input_value",name:"V",check:"Vector3"}], output:"Vector3", colour:CAT_COLOR.vector, tooltip:"Vector3", helpUrl:"" },
    { type:"vec3_distance", message0:"Distance %1 %2", args0:[{type:"input_value",name:"A",check:"Vector3"},{type:"input_value",name:"B",check:"Vector3"}], output:"float", colour:CAT_COLOR.vector, tooltip:"float", helpUrl:"" },
    { type:"vec3_dot", message0:"Dot %1 %2", args0:[{type:"input_value",name:"A",check:"Vector3"},{type:"input_value",name:"B",check:"Vector3"}], output:"float", colour:CAT_COLOR.vector, tooltip:"float", helpUrl:"" },
    { type:"vec3_cross", message0:"Cross %1 %2", args0:[{type:"input_value",name:"A",check:"Vector3"},{type:"input_value",name:"B",check:"Vector3"}], output:"Vector3", colour:CAT_COLOR.vector, tooltip:"Vector3", helpUrl:"" },

    // ----------------------------
    // Time
    // ----------------------------
    { type:"time_deltaTime", message0:"Time.deltaTime", output:"float", colour:CAT_COLOR.time, tooltip:"float", helpUrl:"" },
    { type:"time_time", message0:"Time.time", output:"float", colour:CAT_COLOR.time, tooltip:"float", helpUrl:"" },

    // ----------------------------
    // Input (Legacy Input)
    // ----------------------------
    {
      type: "input_getkey",
      message0: "GetKey %1 が %2",
      args0: [
        { type: "field_dropdown", name: "KEY", options: buildKeyCodeOptions() },
        { type: "field_dropdown", name: "MODE", options: [["押されたとき","down"],["ている間","stay"],["終わったとき","up"]] }
      ],
      output: "bool",
      colour: CAT_COLOR.unity,
      tooltip: "bool",
      helpUrl: ""
    },
    {
      type: "input_getmouse",
      message0: "マウス %1 が %2",
      args0: [
        { type: "field_dropdown", name: "BTN", options: [["左","0"],["右","1"],["ミドル","2"]] },
        { type: "field_dropdown", name: "MODE", options: [["押されたとき","down"],["ている間","stay"],["終わったとき","up"]] }
      ],
      output: "bool",
      colour: CAT_COLOR.unity,
      tooltip: "bool",
      helpUrl: ""
    },
    {
      type: "input_getaxis",
      message0: "GetAxis %1",
      args0: [
        { type: "field_dropdown", name: "AXIS", options: [["Horizontal","Horizontal"],["Vertical","Vertical"],["Mouse X","Mouse X"],["Mouse Y","Mouse Y"],["Mouse ScrollWheel","Mouse ScrollWheel"]] }
      ],
      output: "float",
      colour: CAT_COLOR.unity,
      tooltip: "float",
      helpUrl: ""
    },
    { type:"input_mousepos", message0:"mousePosition", output:"Vector3", colour:CAT_COLOR.unity, tooltip:"Vector3", helpUrl:"" },

    // ----------------------------
    // GameObject / Component
    // ----------------------------
    {
      type: "go_get_transform",
      message0: "%1 の Transform",
      args0: [{ type:"input_value", name:"GO", check:"GameObject" }],
      output: "Transform",
      colour: CAT_COLOR.unity,
      tooltip: "Transform",
      helpUrl: ""
    },
    {
      type: "tr_get_gameobject",
      message0: "%1 の GameObject",
      args0: [{ type:"input_value", name:"TR", check:"Transform" }],
      output: "GameObject",
      colour: CAT_COLOR.unity,
      tooltip: "GameObject",
      helpUrl: ""
    },
        {
      type: "go_getcomponent",
      message0: "%1 = GetComponent< %2 > (%3)",
      args0: [
        { type:"field_input", name:"OUTN", text:"" },
        { type:"field_dropdown", name:"CT", options: COMPONENT_TYPES.map(t => [t,t]) },
        { type:"input_value", name:"GO", check:"GameObject" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT_COLOR.unity,
      tooltip: "void",
      helpUrl: ""
    },

    // ----------------------------
    // Transform (Reporter / Stack)
    // ----------------------------
    // Getters
    { type:"tr_pos", message0:"%1 の 位置", args0:[{type:"input_value",name:"TR",check:"Transform"}], output:"Vector3", colour:CAT_COLOR.unity, tooltip:"Vector3", helpUrl:"" },
    { type:"tr_lpos", message0:"%1 の ローカル位置", args0:[{type:"input_value",name:"TR",check:"Transform"}], output:"Vector3", colour:CAT_COLOR.unity, tooltip:"Vector3", helpUrl:"" },
    { type:"tr_rot", message0:"%1 の 回転", args0:[{type:"input_value",name:"TR",check:"Transform"}], output:"Quaternion", colour:CAT_COLOR.unity, tooltip:"Quaternion", helpUrl:"" },
    { type:"tr_lrot", message0:"%1 の ローカル回転", args0:[{type:"input_value",name:"TR",check:"Transform"}], output:"Quaternion", colour:CAT_COLOR.unity, tooltip:"Quaternion", helpUrl:"" },
    { type:"tr_euler", message0:"%1 の 角度", args0:[{type:"input_value",name:"TR",check:"Transform"}], output:"Vector3", colour:CAT_COLOR.unity, tooltip:"Vector3", helpUrl:"" },
    { type:"tr_leuler", message0:"%1 の ローカル角度", args0:[{type:"input_value",name:"TR",check:"Transform"}], output:"Vector3", colour:CAT_COLOR.unity, tooltip:"Vector3", helpUrl:"" },
    { type:"tr_forward", message0:"%1 の 前の向き", args0:[{type:"input_value",name:"TR",check:"Transform"}], output:"Vector3", colour:CAT_COLOR.unity, tooltip:"Vector3", helpUrl:"" },
    { type:"tr_right", message0:"%1 の 右の向き", args0:[{type:"input_value",name:"TR",check:"Transform"}], output:"Vector3", colour:CAT_COLOR.unity, tooltip:"Vector3", helpUrl:"" },
    { type:"tr_up", message0:"%1 の 上の向き", args0:[{type:"input_value",name:"TR",check:"Transform"}], output:"Vector3", colour:CAT_COLOR.unity, tooltip:"Vector3", helpUrl:"" },

    // Setters
    { type:"tr_set_pos", message0:"%1 の 位置を %2 にする", args0:[{type:"input_value",name:"TR",check:"Transform"},{type:"input_value",name:"V",check:"Vector3"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },
    { type:"tr_set_lpos", message0:"%1 の ローカル位置を %2 にする", args0:[{type:"input_value",name:"TR",check:"Transform"},{type:"input_value",name:"V",check:"Vector3"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },
    { type:"tr_set_rot", message0:"%1 の 回転を %2 にする", args0:[{type:"input_value",name:"TR",check:"Transform"},{type:"input_value",name:"Q",check:"Quaternion"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },
    { type:"tr_set_lrot", message0:"%1 の ローカル回転を %2 にする", args0:[{type:"input_value",name:"TR",check:"Transform"},{type:"input_value",name:"Q",check:"Quaternion"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },
    { type:"tr_set_euler", message0:"%1 の 角度を %2 にする", args0:[{type:"input_value",name:"TR",check:"Transform"},{type:"input_value",name:"E",check:"Vector3"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },
    { type:"tr_set_leuler", message0:"%1 の ローカル角度を %2 にする", args0:[{type:"input_value",name:"TR",check:"Transform"},{type:"input_value",name:"E",check:"Vector3"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },

    // Methods
    { type:"tr_translate", message0:"%1 を %2 だけ移動する", args0:[{type:"input_value",name:"TR",check:"Transform"},{type:"input_value",name:"D",check:"Vector3"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },
    { type:"tr_rotate", message0:"%1 を %2 だけ回転する", args0:[{type:"input_value",name:"TR",check:"Transform"},{type:"input_value",name:"E",check:"Vector3"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },
    { type:"tr_lookat_tr", message0:"%1 が %2 を見る", args0:[{type:"input_value",name:"TR",check:"Transform"},{type:"input_value",name:"T",check:"Transform"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },
    { type:"tr_lookat_v3", message0:"%1 が %2 の位置を見る", args0:[{type:"input_value",name:"TR",check:"Transform"},{type:"input_value",name:"P",check:"Vector3"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },

    // ----------------------------
    // Rigidbody
    // ----------------------------
    {
      type: "rb_addforce",
      message0: "%1 に 力 %2 を加える  (Mode %3)",
      args0: [
        { type:"input_value", name:"RB", check:"Rigidbody" },
        { type:"input_value", name:"F", check:"Vector3" },
        { type:"field_dropdown", name:"MODE", options: [["Force","Force"],["Impulse","Impulse"],["Acceleration","Acceleration"],["VelocityChange","VelocityChange"]] }
      ],
      previousStatement:null, nextStatement:null,
      colour: CAT_COLOR.unity,
      tooltip:"void",
      helpUrl:""
    },
    {
      type: "rb_addtorque",
      message0: "%1 に 回転力 %2 を加える  (Mode %3)",
      args0: [
        { type:"input_value", name:"RB", check:"Rigidbody" },
        { type:"input_value", name:"TQ", check:"Vector3" },
        { type:"field_dropdown", name:"MODE", options: [["Force","Force"],["Impulse","Impulse"],["Acceleration","Acceleration"],["VelocityChange","VelocityChange"]] }
      ],
      previousStatement:null, nextStatement:null,
      colour: CAT_COLOR.unity,
      tooltip:"void",
      helpUrl:""
    },
    { type:"rb_movepos", message0:"%1 の座標を %2 に物理的に変更する", args0:[{type:"input_value",name:"RB",check:"Rigidbody"},{type:"input_value",name:"P",check:"Vector3"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },
    { type:"rb_moverot", message0:"%1 の角度を %2 に物理的に変更する", args0:[{type:"input_value",name:"RB",check:"Rigidbody"},{type:"input_value",name:"Q",check:"Quaternion"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },

    // Properties (get/set)
    { type:"rb_get_useGravity", message0:"%1 の 重力の使用", args0:[{type:"input_value",name:"RB",check:"Rigidbody"}], output:"bool", colour:CAT_COLOR.unity, tooltip:"bool", helpUrl:"" },
    { type:"rb_set_useGravity", message0:"%1 の 重力の使用を %2 にする", args0:[{type:"input_value",name:"RB",check:"Rigidbody"},{type:"input_value",name:"B",check:"bool"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },

    { type:"rb_get_isKinematic", message0:"%1 の 物理の使用", args0:[{type:"input_value",name:"RB",check:"Rigidbody"}], output:"bool", colour:CAT_COLOR.unity, tooltip:"bool", helpUrl:"" },
    { type:"rb_set_isKinematic", message0:"%1 の 物理の使用を %2 にする", args0:[{type:"input_value",name:"RB",check:"Rigidbody"},{type:"input_value",name:"B",check:"bool"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },

    { type:"rb_get_mass", message0:"%1 の 質量", args0:[{type:"input_value",name:"RB",check:"Rigidbody"}], output:"float", colour:CAT_COLOR.unity, tooltip:"float", helpUrl:"" },
    { type:"rb_set_mass", message0:"%1 の 質量を %2 にする", args0:[{type:"input_value",name:"RB",check:"Rigidbody"},{type:"input_value",name:"M",check:"float"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },

    { type:"rb_get_vel", message0:"%1 の velocity", args0:[{type:"input_value",name:"RB",check:"Rigidbody"}], output:"Vector3", colour:CAT_COLOR.unity, tooltip:"Vector3", helpUrl:"" },
    { type:"rb_set_vel", message0:"%1 の velocity を %2 にする", args0:[{type:"input_value",name:"RB",check:"Rigidbody"},{type:"input_value",name:"V",check:"Vector3"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },

    { type:"rb_get_angvel", message0:"%1 の angularVelocity", args0:[{type:"input_value",name:"RB",check:"Rigidbody"}], output:"Vector3", colour:CAT_COLOR.unity, tooltip:"Vector3", helpUrl:"" },
    { type:"rb_set_angvel", message0:"%1 の angularVelocity を %2 にする", args0:[{type:"input_value",name:"RB",check:"Rigidbody"},{type:"input_value",name:"V",check:"Vector3"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.unity, tooltip:"void", helpUrl:"" },

    // ----------------------------
    // Physics.Raycast (statement with optional receivers)
    // ----------------------------
        {
      type: "physics_raycast",
      message0: "%1 = Raycast (%2 から %3 へ 距離 %4)  hit: %5",
      args0: [
        { type:"field_input", name:"OUTN", text:"" },
        { type:"input_value", name:"O", check:"Vector3" },
        { type:"input_value", name:"D", check:"Vector3" },
        { type:"input_value", name:"DIST", check:"float" },
        { type:"field_input", name:"HITN", text:"" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT_COLOR.physics,
      tooltip: "void",
      helpUrl: ""
    },
    // RaycastHit property reporters (variable is passed as value input)
    { type:"hit_point", message0:"%1 の point", args0:[{type:"input_value",name:"H",check:"RaycastHit"}], output:"Vector3", colour:CAT_COLOR.physics, tooltip:"Vector3", helpUrl:"" },
    { type:"hit_normal", message0:"%1 の normal", args0:[{type:"input_value",name:"H",check:"RaycastHit"}], output:"Vector3", colour:CAT_COLOR.physics, tooltip:"Vector3", helpUrl:"" },
    { type:"hit_distance", message0:"%1 の distance", args0:[{type:"input_value",name:"H",check:"RaycastHit"}], output:"float", colour:CAT_COLOR.physics, tooltip:"float", helpUrl:"" },
    { type:"hit_collider", message0:"%1 の collider", args0:[{type:"input_value",name:"H",check:"RaycastHit"}], output:"Collider", colour:CAT_COLOR.physics, tooltip:"Collider", helpUrl:"" },
    { type:"hit_transform", message0:"%1 の transform", args0:[{type:"input_value",name:"H",check:"RaycastHit"}], output:"Transform", colour:CAT_COLOR.physics, tooltip:"Transform", helpUrl:"" },

    // Collider -> GameObject/Transform
    { type:"col_get_go", message0:"%1 の GameObject", args0:[{type:"input_value",name:"C",check:"Collider"}], output:"GameObject", colour:CAT_COLOR.physics, tooltip:"GameObject", helpUrl:"" },
    { type:"col_get_tr", message0:"%1 の Transform", args0:[{type:"input_value",name:"C",check:"Collider"}], output:"Transform", colour:CAT_COLOR.physics, tooltip:"Transform", helpUrl:"" },

    // Collision/Trigger arguments (hat-integrated fixed names)
    { type:"collision_get_collider", message0:"[collision] の コライダー", output:"Collider", colour:CAT_COLOR.physics, tooltip:"Collider", helpUrl:"" },
    { type:"collision_get_go", message0:"[collision] の GameObject", output:"GameObject", colour:CAT_COLOR.physics, tooltip:"GameObject", helpUrl:"" },
    { type:"collision_get_tr", message0:"[collision] の Transform", output:"Transform", colour:CAT_COLOR.physics, tooltip:"Transform", helpUrl:"" },

    { type:"other_get", message0:"[other]", output:"Collider", colour:CAT_COLOR.physics, tooltip:"Collider", helpUrl:"" },
    { type:"other_get_go", message0:"[other] の GameObject", output:"GameObject", colour:CAT_COLOR.physics, tooltip:"GameObject", helpUrl:"" },
    { type:"other_get_tr", message0:"[other] の Transform", output:"Transform", colour:CAT_COLOR.physics, tooltip:"Transform", helpUrl:"" },

    // ----------------------------
    // Animation (Animator)
    // ----------------------------
    { type:"anim_setFloat", message0:"%1 の %2 を %3 にする", args0:[{type:"input_value",name:"A",check:"Animator"},{type:"field_input",name:"K",text:"Param"},{type:"input_value",name:"V",check:"float"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.anim, tooltip:"void", helpUrl:"" },
    { type:"anim_setBool", message0:"%1 の %2 を %3 にする", args0:[{type:"input_value",name:"A",check:"Animator"},{type:"field_input",name:"K",text:"Param"},{type:"input_value",name:"V",check:"bool"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.anim, tooltip:"void", helpUrl:"" },
    { type:"anim_setTrigger", message0:"%1 の Trigger %2 を発火する", args0:[{type:"input_value",name:"A",check:"Animator"},{type:"field_input",name:"K",text:"Trigger"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.anim, tooltip:"void", helpUrl:"" },
    { type:"anim_resetTrigger", message0:"%1 の Trigger %2 を解除する", args0:[{type:"input_value",name:"A",check:"Animator"},{type:"field_input",name:"K",text:"Trigger"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.anim, tooltip:"void", helpUrl:"" },
    { type:"anim_play", message0:"%1 で %2 を再生する", args0:[{type:"input_value",name:"A",check:"Animator"},{type:"field_input",name:"S",text:"State"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.anim, tooltip:"void", helpUrl:"" },
    { type:"anim_set_speed", message0:"%1 の Speed を %2 にする", args0:[{type:"input_value",name:"A",check:"Animator"},{type:"input_value",name:"V",check:"float"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.anim, tooltip:"void", helpUrl:"" },
    { type:"anim_get_speed", message0:"%1 の Speed", args0:[{type:"input_value",name:"A",check:"Animator"}], output:"float", colour:CAT_COLOR.anim, tooltip:"float", helpUrl:"" },

    // ----------------------------
    // Audio
    // ----------------------------
    { type:"aud_play", message0:"%1 を再生する", args0:[{type:"input_value",name:"S",check:"AudioSource"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.audio, tooltip:"void", helpUrl:"" },
    { type:"aud_stop", message0:"%1 を停止する", args0:[{type:"input_value",name:"S",check:"AudioSource"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.audio, tooltip:"void", helpUrl:"" },
    { type:"aud_pause", message0:"%1 を一時停止する", args0:[{type:"input_value",name:"S",check:"AudioSource"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.audio, tooltip:"void", helpUrl:"" },
    { type:"aud_playoneshot", message0:"%1 を %2 の音で重ねて再生する", args0:[{type:"input_value",name:"S",check:"AudioSource"},{type:"input_value",name:"C",check:"AudioClip"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.audio, tooltip:"void", helpUrl:"" },

    { type:"aud_set_volume", message0:"%1 の 音量を %2 にする", args0:[{type:"input_value",name:"S",check:"AudioSource"},{type:"input_value",name:"V",check:"float"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.audio, tooltip:"void", helpUrl:"" },
    { type:"aud_get_volume", message0:"%1 の 音量", args0:[{type:"input_value",name:"S",check:"AudioSource"}], output:"float", colour:CAT_COLOR.audio, tooltip:"float", helpUrl:"" },

    { type:"aud_set_pitch", message0:"%1 の 音程を %2 にする", args0:[{type:"input_value",name:"S",check:"AudioSource"},{type:"input_value",name:"V",check:"float"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.audio, tooltip:"void", helpUrl:"" },
    { type:"aud_get_pitch", message0:"%1 の 音程", args0:[{type:"input_value",name:"S",check:"AudioSource"}], output:"float", colour:CAT_COLOR.audio, tooltip:"float", helpUrl:"" },

    { type:"aud_set_loop", message0:"%1 の 繰り返しを %2 にする", args0:[{type:"input_value",name:"S",check:"AudioSource"},{type:"input_value",name:"B",check:"bool"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.audio, tooltip:"void", helpUrl:"" },
    { type:"aud_get_loop", message0:"%1 の 繰り返し", args0:[{type:"input_value",name:"S",check:"AudioSource"}], output:"bool", colour:CAT_COLOR.audio, tooltip:"bool", helpUrl:"" },

    // ----------------------------
    // SceneManager
    // ----------------------------
    { type:"scene_load", message0:"シーン %1 を読み込む", args0:[{type:"input_value",name:"N",check:"string"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.scene, tooltip:"void", helpUrl:"" },

    // ----------------------------
    // Instantiate / Destroy
    // ----------------------------
        {
      type: "unity_instantiate",
      message0: "%1 = %2 を %3 の位置に %4 の向きでクローンする",
      args0: [
        { type:"field_input", name:"OUTN", text:"" },
        { type:"input_value", name:"PREFAB", check:"GameObject" },
        { type:"input_value", name:"POS", check:"Vector3" },
        { type:"input_value", name:"ROT", check:"Quaternion" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT_COLOR.unity,
      tooltip: "void",
      helpUrl: ""
    },
    // Destroy (delay)
    {
      type: "unity_destroy",
      message0: "%1 秒後に %2 を削除する",
      args0: [
        { type: "input_value", name: "T", check: "float" },
        { type: "input_value", name: "O", check: "GameObject" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT_COLOR.unity,
      tooltip: "void",
      helpUrl: ""
    },


    // ----------------------------
    // Debug
    // ----------------------------
    { type:"dbg_log", message0:"Log %1", args0:[{type:"input_value",name:"S",check:"string"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.debug, tooltip:"void", helpUrl:"" },
    { type:"dbg_ray", message0:"ray %1 から %2 の向きに 距離 %3", args0:[{type:"input_value",name:"O",check:"Vector3"},{type:"input_value",name:"D",check:"Vector3"},{type:"input_value",name:"L",check:"float"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.debug, tooltip:"void", helpUrl:"" },

    // ----------------------------
    // UI (TMP / Image / Button)
    // ----------------------------
    { type:"tmp_get_text", message0:"%1 の text", args0:[{type:"input_value",name:"T",check:"TMP_Text"}], output:"string", colour:CAT_COLOR.ui, tooltip:"string", helpUrl:"" },
    { type:"tmp_set_text", message0:"%1 の text を %2 にする", args0:[{type:"input_value",name:"T",check:"TMP_Text"},{type:"input_value",name:"S",check:"string"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.ui, tooltip:"void", helpUrl:"" },
    { type:"img_set_sprite", message0:"%1 の Sprite を %2 にする", args0:[{type:"input_value",name:"I",check:"Image"},{type:"input_value",name:"S",check:"Sprite"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.ui, tooltip:"void", helpUrl:"" },
    { type:"btn_addlistener", message0:"%1 が押されたとき %2 を実行する", args0:[{type:"input_value",name:"B",check:"Button"},{type:"field_input",name:"FN",text:"PrintMessage"}], previousStatement:null, nextStatement:null, colour:CAT_COLOR.ui, tooltip:"void", helpUrl:"" },

    // ----------------------------
    // List operations (List<T> as concrete var types)
    // ----------------------------
    {
      type: "list_add",
      message0: "%1 に %2 を追加",
      args0: [
        { type:"field_variable", name:"L", variable:"myList", variableTypes: LIST_TYPES , defaultType: LIST_TYPES[0] },
        { type:"input_value", name:"V" }
      ],
      previousStatement:null, nextStatement:null,
      colour: CAT_COLOR.lists,
      tooltip:"void",
      helpUrl:"",
      extensions:["ext_list_item_typed"]
    },
    {
      type: "list_insert",
      message0: "%1 の %2 番に %3 を挿入",
      args0: [
        { type:"field_variable", name:"L", variable:"myList", variableTypes: LIST_TYPES , defaultType: LIST_TYPES[0] },
        { type:"input_value", name:"I", check:"int" },
        { type:"input_value", name:"V" }
      ],
      previousStatement:null, nextStatement:null,
      colour: CAT_COLOR.lists,
      tooltip:"void",
      helpUrl:"",
      extensions:["ext_list_item_typed"]
    },
    {
      type: "list_remove",
      message0: "%1 から %2 を削除",
      args0: [
        { type:"field_variable", name:"L", variable:"myList", variableTypes: LIST_TYPES , defaultType: LIST_TYPES[0] },
        { type:"input_value", name:"V" }
      ],
      previousStatement:null, nextStatement:null,
      colour: CAT_COLOR.lists,
      tooltip:"void",
      helpUrl:"",
      extensions:["ext_list_item_typed"]
    },
    {
      type: "list_removeat",
      message0: "%1 の %2 番を削除",
      args0: [
        { type:"field_variable", name:"L", variable:"myList", variableTypes: LIST_TYPES , defaultType: LIST_TYPES[0] },
        { type:"input_value", name:"I", check:"int" }
      ],
      previousStatement:null, nextStatement:null,
      colour: CAT_COLOR.lists,
      tooltip:"void",
      helpUrl:""
    },
    {
      type: "list_clear",
      message0: "%1 を空にする",
      args0: [
        { type:"field_variable", name:"L", variable:"myList", variableTypes: LIST_TYPES , defaultType: LIST_TYPES[0] }
      ],
      previousStatement:null, nextStatement:null,
      colour: CAT_COLOR.lists,
      tooltip:"void",
      helpUrl:""
    },
    {
      type: "list_contains",
      message0: "%1 に %2 が含まれる",
      args0: [
        { type:"field_variable", name:"L", variable:"myList", variableTypes: LIST_TYPES , defaultType: LIST_TYPES[0] },
        { type:"input_value", name:"V" }
      ],
      output:"bool",
      colour: CAT_COLOR.lists,
      tooltip:"bool",
      helpUrl:"",
      extensions:["ext_list_item_typed"]
    },
    {
      type: "list_indexof",
      message0: "%1 で %2 の位置",
      args0: [
        { type:"field_variable", name:"L", variable:"myList", variableTypes: LIST_TYPES , defaultType: LIST_TYPES[0] },
        { type:"input_value", name:"V" }
      ],
      output:"int",
      colour: CAT_COLOR.lists,
      tooltip:"int",
      helpUrl:"",
      extensions:["ext_list_item_typed"]
    },
    {
      type: "list_count",
      message0: "%1 の Count",
      args0: [
        { type:"field_variable", name:"L", variable:"myList", variableTypes: LIST_TYPES , defaultType: LIST_TYPES[0] }
      ],
      output:"int",
      colour: CAT_COLOR.lists,
      tooltip:"int",
      helpUrl:""
    },
    {
      type: "list_get",
      message0: "%1 の %2 番",
      args0: [
        { type:"field_variable", name:"L", variable:"myList", variableTypes: LIST_TYPES , defaultType: LIST_TYPES[0] },
        { type:"input_value", name:"I", check:"int" }
      ],
      output: null,
      colour: CAT_COLOR.lists,
      tooltip: "", // by extension
      helpUrl:"",
      extensions:["ext_list_get_typed"]
    },
    {
      type: "list_set",
      message0: "%1 の %2 番を %3 にする",
      args0: [
        { type:"field_variable", name:"L", variable:"myList", variableTypes: LIST_TYPES , defaultType: LIST_TYPES[0] },
        { type:"input_value", name:"I", check:"int" },
        { type:"input_value", name:"V" }
      ],
      previousStatement:null, nextStatement:null,
      colour: CAT_COLOR.lists,
      tooltip:"void",
      helpUrl:"",
      extensions:["ext_list_item_typed"]
    },
  ]);
  // }

  // -------- Extensions (minimal JS is allowed where necessary) --------
  Blockly.Extensions.register("ext_var_get_typed", function() {
    const field = this.getField("VAR");
    const update = () => {
      const v = field.getVariable();
      const t = v ? v.type : null;
      this.setOutput(true, t || null);
      this.setTooltip(t || "");
    };
    this.setOnChange(update);
    update();
  });

  Blockly.Extensions.register("ext_var_set_typed", function() {
    const field = this.getField("VAR");
    const update = () => {
      const v = field.getVariable();
      const t = v ? v.type : null;
      const input = this.getInput("VALUE");
      if (input) input.setCheck(t || null);
    };
    this.setOnChange(update);
    update();
  });

  Blockly.Extensions.register("ext_list_item_typed", function() {
    const field = this.getField("L");
    const update = () => {
      const v = field.getVariable();
      const listT = v ? v.type : null;
      const elemT = listTypeToElementType(listT);
      const input = this.getInput("V");
      if (input) input.setCheck(elemT || null);
    };
    this.setOnChange(update);
    update();
  });

  Blockly.Extensions.register("ext_list_get_typed", function() {
    const field = this.getField("L");
    const update = () => {
      const v = field.getVariable();
      const listT = v ? v.type : null;
      const elemT = listTypeToElementType(listT);
      this.setOutput(true, elemT || null);
      this.setTooltip(elemT || "");
    };
    this.setOnChange(update);
    update();
  });

  _patchAllTooltips();
}

let __extensionsRegistered = false;

function _registerExtensionsOnce() {
  if (__extensionsRegistered) return;
  __extensionsRegistered = true;

  // -------- Extensions (minimal JS is allowed where necessary) --------
  Blockly.Extensions.register("ext_var_get_typed", function() {
    const field = this.getField("VAR");
    const update = () => {
      const v = field.getVariable();
      const t = v ? v.type : null;
      this.setOutput(true, t || null);
      this.setTooltip(t || "");
    };
    this.setOnChange(update);
    update();
  });

  Blockly.Extensions.register("ext_var_set_typed", function() {
    const field = this.getField("VAR");
    const update = () => {
      const v = field.getVariable();
      const t = v ? v.type : null;
      const input = this.getInput("VALUE");
      if (input) input.setCheck(t || null);
    };
    this.setOnChange(update);
    update();
  });

  Blockly.Extensions.register("ext_list_item_typed", function() {
    const field = this.getField("L");
    const update = () => {
      const v = field.getVariable();
      const listT = v ? v.type : null;
      const elemT = listTypeToElementType(listT);
      const input = this.getInput("V");
      if (input) input.setCheck(elemT || null);
    };
    this.setOnChange(update);
    update();
  });

  Blockly.Extensions.register("ext_list_get_typed", function() {
    const field = this.getField("L");
    const update = () => {
      const v = field.getVariable();
      const listT = v ? v.type : null;
      const elemT = listTypeToElementType(listT);
      this.setOutput(true, elemT || null);
      this.setTooltip(elemT || "");
    };
    this.setOnChange(update);
    update();
  });
}

/** KeyCode dropdown options (pragmatic set for now; can be expanded later). */
function buildKeyCodeOptions() {
  // Source list is based on Unity docs enumeration entries (includes A-Z, digits, arrows, function keys, etc). 
  const names = [
    "None","Backspace","Delete","Tab","Clear","Return","Pause","Escape","Space",
    "Keypad0","Keypad1","Keypad2","Keypad3","Keypad4","Keypad5","Keypad6","Keypad7","Keypad8","Keypad9",
    "KeypadPeriod","KeypadDivide","KeypadMultiply","KeypadMinus","KeypadPlus","KeypadEnter","KeypadEquals",
    "UpArrow","DownArrow","RightArrow","LeftArrow","Insert","Home","End","PageUp","PageDown",
    "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","F13","F14","F15",
    "Alpha0","Alpha1","Alpha2","Alpha3","Alpha4","Alpha5","Alpha6","Alpha7","Alpha8","Alpha9",
    "Exclaim","DoubleQuote","Hash","Dollar","Percent","Ampersand","Quote","LeftParen","RightParen","Asterisk","Plus","Comma","Minus","Period","Slash",
    "Colon","Semicolon","Less","Equals","Greater","Question","At","LeftBracket","Backslash","RightBracket","Caret","Underscore","BackQuote",
    "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
    "Numlock","CapsLock","ScrollLock","RightShift","LeftShift","RightControl","LeftControl","RightAlt","LeftAlt",
    "Mouse0","Mouse1","Mouse2","Mouse3","Mouse4","Mouse5","Mouse6",
    "Menu","Help","Print","SysReq","Break"
  ];
  return names.map(n => [n, n]);
}

/**
 * Register a *fixed-shape* procedure signature as concrete block types.
 * - No post-creation editing.
 * - Max args = 6 (validated by UI).
 */
export function registerProcedureBlocks(proc) {
  const id = proc.id; // stable id string
  const defType = `proc_def_${id}`;
  const callStmtType = `proc_call_stmt_${id}`;
  const callValType = `proc_call_val_${id}`;

  // Definition block JSON (hat-style, statement body)
  const defJson = {
    type: defType,
    message0: "関数 %1",
    args0: [{ type: "field_label", name: "NAME", text: proc.name }],
    message1: "実行 %1",
    args1: [{ type: "input_statement", name: "DO" }],
    colour: CAT_COLOR.proc,
    tooltip: "void",
    helpUrl: ""
  };

  // Call statement JSON (optionally with receiver for non-void)
  const callStmtArgs = [{ type: "field_label", name: "NAME", text: proc.name }];
  const callMsgParts = [];
  callMsgParts.push("関数 %1");
  let nextIndex = 2;

  if (proc.returnType !== "void") {
    callStmtArgs.push({ type: "field_input", name: "OUTN", text: "" });
    callMsgParts.push("結果→ %" + nextIndex);
    nextIndex++;
  }

  for (let i = 0; i < proc.args.length; i++) {
    callStmtArgs.push({ type: "input_value", name: `A${i}`, check: proc.args[i].type });
    callMsgParts.push(proc.args[i].name + " %" + nextIndex);
    nextIndex++;
  }

  const callStmtJson = {
    type: callStmtType,
    message0: callMsgParts.join(" "),
    args0: callStmtArgs,
    previousStatement: null,
    nextStatement: null,
    colour: CAT_COLOR.proc,
    tooltip: "void",
    helpUrl: ""
  };

  const jsonArr = [defJson, callStmtJson];

  // Call value JSON (reporter) for non-void
  if (proc.returnType !== "void") {
    const callValArgs = [{ type: "field_label", name: "NAME", text: proc.name }];
    const callValMsg = ["関数 %1"];
    let idx = 2;
    for (let i = 0; i < proc.args.length; i++) {
      callValArgs.push({ type: "input_value", name: `A${i}`, check: proc.args[i].type });
      callValMsg.push(proc.args[i].name + " %" + idx);
      idx++;
    }
    jsonArr.push({
      type: callValType,
      message0: callValMsg.join(" "),
      args0: callValArgs,
      output: proc.returnType,
      colour: CAT_COLOR.proc,
      tooltip: proc.returnType,
      helpUrl: ""
    });
  }

  // Arg ref blocks (reporters), one per arg, fixed to this procedure id.
  for (let i = 0; i < proc.args.length; i++) {
    const arg = proc.args[i];
    jsonArr.push({
      type: `proc_arg_${id}_${i}`,
      message0: "%1",
      args0: [{ type: "field_label", name: "ARG", text: arg.name }],
      output: arg.type,
      colour: CAT_COLOR.proc,
      tooltip: arg.type,
      helpUrl: ""
    });
  }

  Blockly.defineBlocksWithJsonArray(jsonArr);
  _patchAllTooltips();

  return { defType, callStmtType, callValType: (proc.returnType !== "void") ? callValType : null };
}

