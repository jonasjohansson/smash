// The extruded mark's settings (extrude.js), apart so the panel can know them
// without loading three.js until 3D is chosen.

export const EXTRUDE_DEFAULTS = {
  depth: 0.35, // of the mark's height
  material: 'white', // white | black (the focus round is black and white)
  faces: false, // pictures on the front face (off: black and white)
  yaw: 24, // degrees, 0 is straight on
  pitch: 14,
  turntable: true, // swing from the front to the side and back
  swing: 62, // degrees either side
  period: 14, // seconds for a full swing
  floor: true, // a floor to stand on, with its shadow
  ground: 'black', // black | white: the room
};
