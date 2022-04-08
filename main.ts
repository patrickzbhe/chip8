let canvas = document.getElementById("canvas") as HTMLCanvasElement;
let emu = new Chip8(canvas.getContext("2d"));
let keys = Array<boolean>(16).fill(false);

const mapping = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  q: 4,
  w: 5,
  e: 6,
  r: 7,
  a: 8,
  s: 9,
  d: 10,
  f: 11,
  z: 12,
  x: 13,
  c: 14,
  v: 15,
};

function handleClick() {
  let reader = new FileReader();
  let f = (document.querySelector("#file") as HTMLInputElement).files[0];
  reader.onloadend = function () {
    emu.load(reader.result as ArrayBuffer);
    emu.run();
  };
  reader.readAsArrayBuffer(f);
}

function keyDown(e: KeyboardEvent) {
  emu.keyDown(mapping[e.key]);
}

function keyUp(e: KeyboardEvent) {
  emu.keyUp(mapping[e.key]);
}

const button = document.querySelector("#read-file");
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);
button?.addEventListener("click", handleClick);
