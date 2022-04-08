class Chip8 {
  private memory: Uint8Array = new Uint8Array(4096);
  private V: Uint8Array = new Uint8Array(16);
  private display: number[];
  private I: number;
  private stack: number[] = [];
  private keypad: boolean[] = [];
  private prevpad: boolean[] = [];
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private pc: number;
  private delayTimer: number;
  private soundTimer: number;
  private blocking: boolean;
  private fps: number;
  private frameSpeed;
  public shift: boolean;
  public jump: boolean;
  public storeLoad: boolean;

  constructor() {
    this.frameSpeed = 5;
    this.fps = 0;
    this.fps;
    this.pc = 0;
    this.canvas = document.getElementById("canvas") as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d");
    this.display = new Array(2048);
    this.blocking = false;
    for (let i = 0; i < 2048; i++) {
      this.display[i] = 0;
    }

    for (let i = 0; i < 16; i++) {
      this.keypad.push(false);
    }
    this.prevpad = this.keypad;

    let font = [
      0xf0, 0x90, 0x90, 0x90, 0xf0, 0x20, 0x60, 0x20, 0x20, 0x70, 0xf0, 0x10,
      0xf0, 0x80, 0xf0, 0xf0, 0x10, 0xf0, 0x10, 0xf0, 0x90, 0x90, 0xf0, 0x10,
      0x10, 0xf0, 0x80, 0xf0, 0x10, 0xf0, 0xf0, 0x80, 0xf0, 0x90, 0xf0, 0xf0,
      0x10, 0x20, 0x40, 0x40, 0xf0, 0x90, 0xf0, 0x90, 0xf0, 0xf0, 0x90, 0xf0,
      0x10, 0xf0, 0xf0, 0x90, 0xf0, 0x90, 0x90, 0xe0, 0x90, 0xe0, 0x90, 0xe0,
      0xf0, 0x80, 0x80, 0x80, 0xf0, 0xe0, 0x90, 0x90, 0x90, 0xe0, 0xf0, 0x80,
      0xf0, 0x80, 0xf0, 0xf0, 0x80, 0xf0, 0x80, 0x80,
    ];

    for (let i = 10; i < 10 + font.length; i++) {
      this.memory[i] = font[i - 10];
    }

    this.I = 0;
    this.shift = false;
    this.jump = true;
    this.storeLoad = false;
    this.delayTimer = 0;
    this.soundTimer = 0;
  }

  private draw() {
    for (let i = 0; i < 32; i++) {
      for (let j = 0; j < 64; j++) {
        if (this.display[i * 64 + j] == 1) {
          this.context.fillStyle = "#FFFFFF";
        } else {
          this.context.fillStyle = "#000000";
        }
        this.context.fillRect(j * 10, i * 10, 10, 10);
      }
    }
  }

  private clear() {
    for (let i = 0; i < 2048; i++) {
      this.display[i] = 0;
    }
  }

  private current_sprite(i: number) {
    return this.memory[this.I + i];
  }

  private ith_bit(n: number, i: number) {
    return n & (1 << i);
  }

  private execute(instr: number) {
    let X = (instr & 0x0f00) >> 8;
    let Y = (instr & 0x00f0) >> 4;
    let N = instr & 0x000f;
    let NN = instr & 0x00ff;
    let NNN = instr & 0x0fff;
    let type = (instr & 0xf000) >> 12;

    if (type == 0x0) {
      if (instr == 0x00e0) {
        this.clear();
      } else if (instr == 0x00ee) {
        if (this.stack.length == 0) {
          throw "Empty Stack";
        }
        this.pc = this.stack.pop();
      }
    } else if (type == 0x1) {
      this.pc = NNN;
    } else if (type == 0x2) {
      // check is pc is right here
      this.stack.push(this.pc);
      this.pc = NNN;
    } else if (type == 0x3) {
      if (this.V[X] == NN) {
        this.pc += 2;
      }
    } else if (type == 0x4) {
      if (this.V[X] != NN) {
        this.pc += 2;
      }
    } else if (type == 0x5) {
      if (this.V[X] == this.V[Y]) {
        this.pc += 2;
      }
    } else if (type == 0x6) {
      this.V[X] = NN;
    } else if (type == 0x7) {
      this.V[X] += NN;
    } else if (type == 0x8) {
      if (N == 0x0) {
        this.V[X] = this.V[Y];
      } else if (N == 0x1) {
        this.V[X] = this.V[X] | this.V[Y];
      } else if (N == 0x2) {
        this.V[X] = this.V[X] & this.V[Y];
      } else if (N == 0x3) {
        this.V[X] = this.V[X] ^ this.V[Y];
      } else if (N == 0x4) {
        this.V[X] = this.V[X] + this.V[Y];
        if (this.V[X] + this.V[Y] > 255) {
          this.V[15] = 1;
        } else {
          this.V[15] = 0;
        }
      } else if (N == 0x5) {
        this.V[X] = this.V[X] - this.V[Y];
        this.V[15] = 0;
        if (this.V[X] > this.V[Y]) {
          this.V[15] = 1;
        }
      } else if (N == 0x7) {
        this.V[X] = this.V[Y] - this.V[X];
        this.V[15] = 0;
        if (this.V[Y] > this.V[X]) {
          this.V[15] = 1;
        }
      } else if (N == 0x6) {
        if (this.shift) {
          this.V[X] = this.V[Y];
        }
        this.V[15] = 0;
        if (this.ith_bit(this.V[X], 0) != 0) {
          this.V[15] = 1;
        }
        this.V[X] = this.V[X] >> 1;
      } else if (N == 0xe) {
        if (this.shift) {
          this.V[X] = this.V[Y];
        }
        this.V[15] = 0;
        if (this.ith_bit(this.V[X], 7) != 0) {
          this.V[15] = 1;
        }
        this.V[X] = this.V[X] << 1;
      }
    } else if (type == 0x9) {
      if (this.V[X] != this.V[Y]) {
        this.pc += 2;
      }
    } else if (type == 0xa) {
      this.I = NNN;
    } else if (type == 0xb) {
      if (this.jump) {
        this.pc = NNN + this.V[0];
      } else {
        this.pc = NNN + this.V[X];
      }
    } else if (type == 0xc) {
      this.V[X] = NN & Math.floor(Math.random() * 65536);
    } else if (type == 0xd) {
      let x = this.V[X] % 64;
      let y = this.V[Y] % 32;
      this.V[15] = 0;

      for (let i = 0; i < N; i++) {
        let xx = x;
        let cb = this.current_sprite(i);

        for (let j = 0; j < 8; j++) {
          if (xx > 63) {
            break;
          }
          let ith = this.ith_bit(cb, 7 - j);

          if (ith != 0 && this.display[y * 64 + xx] == 1) {
            this.display[y * 64 + xx] = 0;
            this.V[15] = 1;
          } else if (ith != 0 && this.display[y * 64 + xx] == 0) {
            this.display[y * 64 + xx] = 1;
          }
          xx += 1;
        }
        y += 1;
        if (y > 31) {
          break;
        }
      }

      this.draw();
    } else if (type == 0xe) {
      let cur_key = this.keypad[this.V[X]];

      if (NN == 0xa1) {
        cur_key = !cur_key;
      }
      if (cur_key) {
        this.pc += 2;
      }
    } else if (type == 0xf) {
      if (NN == 0x07) {
        this.V[X] = this.delayTimer;
      } else if (NN == 0x15) {
        this.delayTimer = this.V[X];
      } else if (NN == 0x18) {
        this.soundTimer = this.V[X];
      } else if (NN == 0x1e) {
        this.I += this.V[X];
      } else if (NN == 0x0a) {
        if (!this.blocking) {
          this.prevpad = [...this.keypad];
          this.blocking = true;
        }

        for (let i = 0; i < 16; i++) {
          if (this.prevpad[i] == true && this.keypad[i] == false) {
            this.prevpad[i] = false;
          }
        }

        for (let i = 0; i < 16; i++) {
          if (this.prevpad[i] == false && this.keypad[i] == true) {
            this.V[X] = i;
            this.blocking = false;
            return;
          }
        }
        this.pc -= 2;
      } else if (NN == 0x29) {
        this.I = (this.V[X] & 0xf) + 10;
      } else if (NN == 0x33) {
        this.memory[this.I] = Math.floor(this.V[X] / 100);
        this.memory[this.I + 1] = Math.floor((this.V[X] % 100) / 10);
        this.memory[this.I + 2] = Math.floor(this.V[X] % 10);
      } else if (NN == 0x55) {
        for (let i = 0; i <= X; i++) {
          this.memory[this.I + i] = this.V[i];
          if (this.storeLoad) {
            this.I += 1;
          }
        }
      } else if (NN == 0x65) {
        for (let i = 0; i <= X; i++) {
          this.V[i] = this.memory[this.I + i];
          if (this.storeLoad) {
            this.I += 1;
          }
        }
      }
    } else {
      console.log("Invalid command");
    }
  }

  public load(inputArray: ArrayBuffer) {
    let offset = 512;
    let uint8data = new Uint8Array(inputArray);
    for (let i = 0; i < inputArray.byteLength; i++) {
      this.memory[offset + i] = uint8data[i];
    }
  }

  public keyDown(key: number) {
    this.keypad[key] = true;
  }

  public keyUp(key: number) {
    this.keypad[key] = false;
  }

  private step() {
    let instr = (this.memory[this.pc] << 8) + this.memory[this.pc + 1];
    this.pc += 2;
    this.fps += 1;
    document.querySelector("#pc").innerHTML = this.pc.toString();
    this.execute(instr);
  }

  private decrementDelay() {
    if (this.delayTimer > 0) {
      this.delayTimer -= 1;
    }
    if (this.soundTimer > 0) {
      this.soundTimer -= 1;
    }
  }

  private multiStep() {
    for (let i = 0; i < this.frameSpeed; i++) {
      this.step();
    }
  }

  public run() {
    this.pc = 512;

    setInterval(this.multiStep.bind(this), 1);
    setInterval(this.decrementDelay.bind(this), 1000 / 60);
  }
}
