// src/config.js
// Central constants and simple helpers.

/** Blockly "type" strings -> C# type strings. */
export const TYPE_TO_CS = Object.freeze({
  void: "void",
  int: "int",
  float: "float",
  bool: "bool",
  string: "string",

  Vector2: "Vector2",
  Vector3: "Vector3",
  Quaternion: "Quaternion",
  Color: "Color",

  GameObject: "GameObject",
  Transform: "Transform",
  Rigidbody: "Rigidbody",
  Collider: "Collider",
  Collision: "Collision",
  RaycastHit: "RaycastHit",

  AudioSource: "AudioSource",
  AudioClip: "AudioClip",
  Animator: "Animator",

  TMP_Text: "TMP_Text",
  Image: "Image",
  Button: "Button",
  Sprite: "Sprite",
  Camera: "Camera",
});

/** Category colours (category-based colour scheme is confirmed). */
export const CAT_COLOR = Object.freeze({
  events: 20,
  control: 120,
  vars: 330,
  lists: 290,
  math: 230,
  vector: 200,
  unity: 160,
  physics: 10,
  anim: 300,
  audio: 60,
  ui: 40,
  scene: 90,
  debug: 0,
  time: 180,
  proc: 260,
});

/** Supported base types for global variables and procedure signatures. */
export const BASE_TYPES = Object.freeze([
  "int", "float", "bool", "string",
  "Vector2", "Vector3", "Quaternion", "Color",
  "GameObject", "Transform", "Rigidbody", "Collider",
  "RaycastHit",
  "AudioSource", "AudioClip", "Animator",
  "TMP_Text", "Image", "Button", "Sprite", "Camera",
]);

/** List types are concrete strings: List_<T>. No runtime type-change. */
export const LIST_TYPES = Object.freeze(BASE_TYPES.map(t => `List_${t}`));

/** Component<T> dropdown: only "known types" and only those that are components. */
export const COMPONENT_TYPES = Object.freeze([
  "Transform", "Rigidbody", "Collider", "Animator", "AudioSource",
  "TMP_Text", "Image", "Button", "Camera",
]);

export const ALL_VAR_TYPES = Object.freeze([...BASE_TYPES, ...LIST_TYPES]);

/**
 * Name validation per your latest decisions:
 * - Must be exact (no leading/trailing whitespace)
 * - Reject full-width / non-ASCII characters
 * - Reject any whitespace inside
 */
export function validateNameStrict(name) {
  if (typeof name !== "string") return { ok: false, reason: "not_string" };
  if (name.length === 0) return { ok: false, reason: "empty" };
  if (name !== name.trim()) return { ok: false, reason: "leading_or_trailing_space" };
  if (/\s/.test(name)) return { ok: false, reason: "contains_whitespace" };
  if (/[^\u0020-\u007E]/.test(name)) return { ok: false, reason: "contains_non_ascii" };
  return { ok: true };
}

/** Conservative banned set: C# keywords + common Unity members we generate. */
export const BANNED_IDENTIFIERS = new Set([
  // C# keywords
  "abstract","as","base","bool","break","byte","case","catch","char","checked","class","const","continue",
  "decimal","default","delegate","do","double","else","enum","event","explicit","extern","false","finally","fixed",
  "float","for","foreach","goto","if","implicit","in","int","interface","internal","is","lock","long","namespace","new",
  "null","object","operator","out","override","params","private","protected","public","readonly","ref","return","sbyte",
  "sealed","short","sizeof","stackalloc","static","string","struct","switch","this","throw","true","try","typeof","uint",
  "ulong","unchecked","unsafe","ushort","using","virtual","void","volatile","while",

  // Unity event methods
  "Start","Update","OnCollisionEnter","OnCollisionStay","OnCollisionExit","OnTriggerEnter","OnTriggerStay","OnTriggerExit",

  // Common Unity members
  "gameObject","transform","position","localPosition","rotation","localRotation","eulerAngles","localEulerAngles",
  "forward","right","up","Translate","Rotate","LookAt",
  "AddForce","AddTorque","MovePosition","MoveRotation",
  "useGravity","isKinematic","mass","velocity","angularVelocity",
  "Raycast","Physics","Debug","Log","DrawRay","Input",
  "GetKey","GetKeyDown","GetKeyUp","GetMouseButton","GetMouseButtonDown","GetMouseButtonUp","GetAxis","mousePosition",
  "Time","deltaTime","time",
  "Animator","SetFloat","SetBool","SetTrigger","ResetTrigger","Play","speed",
  "AudioSource","PlayOneShot","Stop","Pause","volume","pitch","loop",
  "SceneManager","LoadScene",
  "Instantiate","Destroy",
  "Button","onClick","AddListener",

  // Common types (avoid collisions)
  ...Object.values(TYPE_TO_CS),
]);

/** List<T> C# element type mapping from "List_<T>" */
export function listTypeToElementType(listType) {
  if (!listType || typeof listType !== "string") return null;
  if (!listType.startsWith("List_")) return null;
  const t = listType.slice("List_".length);
  return BASE_TYPES.includes(t) ? t : null;
}

/** Helper for indentation. */
export function indentLines(lines, level) {
  const pad = " ".repeat(level * 4);
  return lines.map(l => (l.length ? pad + l : l));
}
