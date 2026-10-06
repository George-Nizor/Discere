import {
  bar,
  beam,
  beat,
  card,
  choose,
  f,
  fs,
  numeric,
  point,
  word,
  type TeachingLesson,
} from "./definition.js";

export const equilibriumLessons: TeachingLesson[] = [
  {
    id: "forces-as-vectors",
    title: "Forces as vectors",
    summary: "Resolve forces into components and add them on a free-body diagram.",
    moduleId: "engr-equilibrium",
    sourceIds: ["engr-up-equilibrium", "engr-es-equilibrium"],
    beats: [
      beat(
        "Split one force",
        "A force at angle θ above the horizontal splits into F cos θ along the horizontal and F sin θ along the vertical. For 10 kN at 30°, that is 10 cos 30° = 8.66 kN across and 10 sin 30° = 5.00 kN up. The two components together act exactly as the original force does, so a free-body diagram may show either description, never both.",
        ["10 kN at 30°", point("kN", f("F", 10, 30))],
        ["10 kN at 60°", point("kN", f("F", 10, 60))],
      ),
      beat(
        "Read a slope, not an angle",
        "Drawings often give a slope instead of an angle. A line rising 3 for every 4 across has length 5 on the same scale, so cos θ = 4/5 and sin θ = 3/5 without a calculator. A 5 kN pull along it has components 4 kN across and 3 kN up. Scale the force by the matching side of the triangle over its long side.",
        ["5 kN, slope 3 in 4", point("kN", fs("T", 5, 4, 3))],
        ["13 kN, slope 5 in 12", point("kN", fs("T", 13, 12, 5))],
      ),
      beat(
        "Add components, not sizes",
        "Forces in different directions do not add like plain numbers. Sum the x-components, sum the y-components, then combine them: R = √(Rx² + Ry²). The 3 kN and 4 kN forces give Rx = 3 kN, Ry = 4 kN and R = 5 kN. Only when two forces share a line of action does their sum reach 7 kN.",
        ["At right angles", point("kN", f("P", 3, 0), f("Q", 4, 90))],
        ["Along one line", point("kN", f("P", 3, 0), f("Q", 4, 0))],
      ),
      beat(
        "Close the force polygon",
        "A point is in equilibrium when ΣFx = 0 and ΣFy = 0. Drawn tip to tail, its forces then close into a polygon with no gap. The third force must match the resultant of the other two in size and point exactly opposite it; here that means 10 kN. Press Play to slide the arrows tip to tail: with a 7 kN third force a gap remains.",
        ["Two forces", point("kN", f("A", 6, 0), f("B", 8, 90))],
        [
          "Add a 7 kN third force",
          point(
            "kN",
            f("A", 6, 0),
            f("B", 8, 90),
            f("C", 7, 180 + (Math.atan2(4, 3) * 180) / Math.PI),
          ),
        ],
      ),
    ],
    questions: [
      numeric(
        "A 10 kN force acts at 30° above the horizontal. Find its horizontal component in kN, to two decimal places.",
        8.66,
        "Horizontal component = 10 cos 30° = 8.660 kN, which rounds to 8.66 kN. Using sin 30° by mistake gives 5 kN, the vertical component.",
        [
          "The horizontal side of the triangle is adjacent to the 30° angle.",
          "Adjacent side = hypotenuse × cos θ.",
          "Calculate 10 × cos 30° and round to two decimal places.",
        ],
        "kN",
        0.006,
      ),
      numeric(
        "A cable pulls with 5 kN along a line that rises 3 m for every 4 m across. Find the vertical component of the pull in kN.",
        3,
        "The slope triangle 3–4–5 gives sin θ = 3/5, so the vertical component is 5 × 3/5 = 3 kN.",
        [
          "Find the long side of a triangle with sides 3 and 4.",
          "The vertical component is the force times rise over the long side.",
          "Calculate 5 × 3/5.",
        ],
        "kN",
      ),
      numeric(
        "A pin carries 3 kN acting horizontally and 4 kN acting vertically. Find the magnitude of their resultant in kN.",
        5,
        "R = √(3² + 4²) = √25 = 5 kN. Adding the sizes to get 7 kN treats perpendicular forces as if they were aligned.",
        [
          "The forces are at right angles, so their sizes do not simply add.",
          "Use Pythagoras on the summed components.",
          "Calculate √(3² + 4²).",
        ],
        "kN",
      ),
      numeric(
        "A ring is held by 6 kN acting along +x and 8 kN acting along +y. What magnitude, in kN, must a third force have to keep the ring in equilibrium?",
        10,
        "The third force must cancel the resultant of the first two: √(6² + 8²) = 10 kN, pointing opposite it.",
        [
          "Equilibrium needs the sum of all forces to be zero.",
          "The third force equals the resultant of the other two in size.",
          "Calculate √(6² + 8²).",
        ],
        "kN",
      ),
      numeric(
        "Forces of 12 kN along +x and 5 kN along +y act on the pin of a gusset plate. Find the magnitude of their resultant in kN.",
        13,
        "R = √(12² + 5²) = √169 = 13 kN.",
        [
          "Treat the two forces as perpendicular components.",
          "Square each, add, then take the square root.",
          "Calculate √(144 + 25).",
        ],
        "kN",
      ),
      choose(
        "A lamp hangs from two cables. Its free-body diagram isolates the lamp. Which force belongs on that diagram?",
        [
          "The pull of each cable on the lamp",
          "The pull of the lamp on the ceiling",
          "The weight of the ceiling",
        ],
        0,
        "A free-body diagram shows only forces acting on the isolated body: the lamp's weight and the two cable pulls on it.",
        "Ask which body each force acts on.",
      ),
    ],
    cards: [
      card(
        "A 13 kN force acts along a line rising 5 for every 12 across. Find its horizontal component in kN.",
        12,
        "The 5–12–13 triangle gives 13 × 12/13 = 12 kN.",
        "kN",
      ),
      card(
        "Forces of 9 kN along +x and 12 kN along −y act on a pin. Find the magnitude of their resultant in kN.",
        15,
        "R = √(9² + 12²) = 15 kN. The minus sign sets the direction, not the size.",
        "kN",
      ),
    ],
  },
  {
    id: "moments",
    title: "Turning effect: moments",
    summary:
      "Find the moment of a force about a point and balance clockwise against anticlockwise.",
    moduleId: "engr-equilibrium",
    sourceIds: ["engr-up-torque", "engr-es-moment"],
    beats: [
      beat(
        "Force times perpendicular distance",
        "A moment measures how strongly a force turns a body about a point: M = F × d, where d is the perpendicular distance from the point to the force's line of action. A 150 N push at right angles on a spanner, 0.3 m from the bolt, gives 150 × 0.3 = 45 N·m. This course counts anticlockwise moments as positive.",
        ["Push at 90°", bar("N", ["F", 0.3, 150, 90])],
        ["Push at 30°", bar("N", ["F", 0.3, 150, 30])],
      ),
      beat(
        "An angled push does less",
        "Only the part of the force at right angles to the arm turns it. At 30°, the perpendicular distance from the bolt to the line of action is 0.3 sin 30° = 0.15 m, so M = 150 × 0.15 = 22.5 N·m. Equivalently, take the perpendicular component 150 sin 30° = 75 N and multiply by the full 0.3 m.",
        ["Push at 30°", bar("N", ["F", 0.3, 150, 30])],
        ["Push at 90°", bar("N", ["F", 0.3, 150, 90])],
      ),
      beat(
        "A force through the pivot",
        "A force whose line of action passes through the point has no lever arm, so its moment about that point is zero, whatever the size of the force. Pulling along a spanner never loosens a nut. Engineers exploit this when they take moments about a point where an unknown force acts: that unknown drops out of the equation.",
        ["Pull along the handle", bar("N", ["F", 0.3, 200, 0])],
        ["Pull across the handle", bar("N", ["F", 0.3, 200, 90])],
      ),
      beat(
        "Balance clockwise against anticlockwise",
        "A body at rest on a pivot has zero net moment. The 300 N child 2 m left turns the plank anticlockwise with 600 N·m; a 400 N child must supply 600 N·m clockwise, so sits 600/400 = 1.5 m right. Add moments with their signs. The sizes of the forces alone do not decide the balance.",
        ["Both 2 m out", bar("N", ["Left", -2, 300, 270], ["Right", 2, 400, 270])],
        ["Heavier child at 1 m", bar("N", ["Left", -2, 300, 270], ["Right", 1, 400, 270])],
      ),
    ],
    questions: [
      numeric(
        "A 150 N force pushes at right angles to a spanner, 0.3 m from the bolt. Find the moment about the bolt in N·m.",
        45,
        "M = F × d = 150 × 0.3 = 45 N·m.",
        [
          "The push is already at right angles, so the full distance counts.",
          "Multiply force by perpendicular distance.",
          "Calculate 150 × 0.3.",
        ],
        "N·m",
      ),
      numeric(
        "The same 150 N force acts 0.3 m from the bolt, but at 30° to the spanner. Find the moment about the bolt in N·m.",
        22.5,
        "M = 150 × 0.3 × sin 30° = 22.5 N·m. Using cos 30° takes the component along the handle, which does not turn it.",
        [
          "Only the component at right angles to the spanner turns it.",
          "That component is F sin θ, where θ is the angle between force and spanner.",
          "Calculate 150 × sin 30° × 0.3.",
        ],
        "N·m",
      ),
      numeric(
        "A 200 N force pulls along a spanner's handle, directly away from the bolt, at a point 0.3 m from it. Find its moment about the bolt in N·m.",
        0,
        "The line of action passes through the bolt, so the perpendicular distance and the moment are both zero.",
        [
          "Sketch the line of action of the force.",
          "Measure the perpendicular distance from the bolt to that line.",
          "Multiply the force by that distance.",
        ],
        "N·m",
      ),
      numeric(
        "A 300 N child sits 2 m left of a seesaw's pivot. How far right of the pivot, in metres, must a 400 N child sit for the seesaw to balance?",
        1.5,
        "Balance needs 400 × d = 300 × 2 = 600 N·m, so d = 1.5 m.",
        [
          "The two moments about the pivot must be equal and opposite.",
          "Find the left child's moment, then divide by the right child's weight.",
          "Calculate 300 × 2 ÷ 400.",
        ],
        "m",
      ),
      numeric(
        "A door handle is 0.8 m from the hinges. It is pulled with 40 N at right angles to the door. Find the moment about the hinges in N·m.",
        32,
        "M = 40 × 0.8 = 32 N·m.",
        [
          "The hinge line is the pivot.",
          "The pull is perpendicular, so use the full 0.8 m.",
          "Calculate 40 × 0.8.",
        ],
        "N·m",
      ),
      choose(
        "To loosen a tight nut with the least effort, where and how should you push on the spanner?",
        [
          "At the end of the handle, at right angles to it",
          "Near the nut, at right angles to the handle",
          "At the end of the handle, along its length",
        ],
        0,
        "The largest perpendicular distance gives the largest moment for a given force, and only a push at right angles uses all of it.",
        "Moment is force times perpendicular distance. Make that distance as large as you can.",
      ),
    ],
    cards: [
      card(
        "A 50 N force acts at right angles to a lever, 0.6 m from its pivot. Find the moment in N·m.",
        30,
        "M = 50 × 0.6 = 30 N·m.",
        "N·m",
      ),
      card(
        "An 80 N force acts 0.5 m from a pivot at 30° to the bar. Find the size of its moment in N·m.",
        20,
        "M = 80 × 0.5 × sin 30° = 20 N·m.",
        "N·m",
      ),
    ],
  },
  {
    id: "supported-beam",
    title: "Reactions of a supported beam",
    summary: "Use ΣF = 0 and ΣM = 0 to find the support reactions of a beam.",
    moduleId: "engr-equilibrium",
    sourceIds: ["engr-up-equilibrium-examples", "engr-es-equilibrium"],
    beats: [
      beat(
        "Take moments about a support",
        "Take moments about a support and its unknown reaction drops out. About A, the 12 kN load acts 2 m away, clockwise, and R_B acts 6 m away, anticlockwise: 6R_B = 12 × 2, so R_B = 4 kN. The support nearer the load always carries the larger share of it.",
        ["Load at 2 m", beam(6, [0, 6], [[2, 12]])],
        ["Load at midspan", beam(6, [0, 6], [[3, 12]])],
      ),
      beat(
        "Then sum the vertical forces",
        "With R_B known, vertical equilibrium gives the other reaction: R_A + R_B = 12 kN, so R_A = 8 kN. Check with moments about B: 6R_A = 12 × 4 = 48. One rigid body gives these equations, ΣF = 0 and ΣM = 0, and a pin and roller under vertical loads leave exactly two unknowns for them to find.",
        ["Load at 2 m", beam(6, [0, 6], [[2, 12]])],
        ["Load at 5 m", beam(6, [0, 6], [[5, 12]])],
      ),
      beat(
        "A spread load acts at its centre",
        "For reactions, a uniform load can be replaced by its total, intensity times length, acting at the middle of the loaded length. Here 4 kN/m over 3 m is 12 kN at x = 1.5 m. Moments about the left support give 6R_B = 12 × 1.5, so R_B = 3 kN and R_A = 9 kN. The replacement works for reactions; inside the loaded length the bending is different.",
        ["Load on the left half", beam(6, [0, 6], [], [[0, 3, 4]])],
        ["Same total, spread evenly", beam(6, [0, 6], [], [[0, 6, 2]])],
      ),
      beat(
        "A load beyond the support",
        "When a load overhangs a support, the far support must pull down. About A: 4R_B = 10 × 6, so R_B = 15 kN upward, more than the load itself. Then R_A = 10 − 15 = −5 kN: the left support holds the beam down. A support built only to push would let that end lift off.",
        ["Load on the overhang", beam(6, [0, 4], [[6, 10]])],
        ["Load between supports", beam(6, [0, 4], [[2, 10]])],
      ),
    ],
    questions: [
      numeric(
        "A 6 m beam rests on a pin at A (x = 0) and a roller at B (x = 6 m). It carries 12 kN at x = 2 m. Take moments about A to find the reaction at B in kN.",
        4,
        "About A: 6R_B = 12 × 2 = 24, so R_B = 4 kN.",
        [
          "Taking moments about A removes R_A from the equation.",
          "The load's moment about A must equal R_B's moment about A.",
          "Calculate 12 × 2 ÷ 6.",
        ],
        "kN",
      ),
      numeric(
        "For the same 6 m beam with 12 kN at x = 2 m, find the reaction at A in kN.",
        8,
        "R_A = 12 − R_B = 12 − 4 = 8 kN. Moments about B confirm it: 12 × 4 ÷ 6 = 8 kN.",
        [
          "The two reactions together must carry the whole load.",
          "Use the reaction at B from moments about A, or take moments about B.",
          "Calculate 12 × 4 ÷ 6.",
        ],
        "kN",
      ),
      numeric(
        "A 6 m beam on supports at x = 0 and x = 6 m carries 4 kN/m over its first 3 m. Find the reaction at the right-hand support in kN.",
        3,
        "The spread load totals 4 × 3 = 12 kN acting at x = 1.5 m. About the left support: 6R = 12 × 1.5, so R = 3 kN.",
        [
          "Replace the spread load by its total acting at the middle of the loaded length.",
          "Take moments about the left support.",
          "Calculate (4 × 3) × 1.5 ÷ 6.",
        ],
        "kN",
      ),
      numeric(
        "A beam has supports at x = 0 and x = 4 m and a 10 kN load at its free end, x = 6 m. Taking upward as positive, find the reaction at x = 0 in kN.",
        -5,
        "About x = 0: 4R_B = 10 × 6, so R_B = 15 kN. Then R_A = 10 − 15 = −5 kN: the left support pulls down.",
        [
          "Find the reaction at x = 4 m first, by moments about x = 0.",
          "Then the two reactions must add to the 10 kN load.",
          "Calculate 10 − 10 × 6 ÷ 4, keeping the sign.",
        ],
        "kN",
      ),
      numeric(
        "A 10 m beam on supports at its ends carries 20 kN at x = 3 m and 10 kN at x = 8 m. Find the left reaction in kN.",
        16,
        "About the right support: 10R_A = 20 × 7 + 10 × 2 = 160, so R_A = 16 kN.",
        [
          "Take moments about the right-hand support to remove its reaction.",
          "Measure each load's distance from x = 10 m.",
          "Calculate (20 × 7 + 10 × 2) ÷ 10.",
        ],
        "kN",
      ),
      word(
        "Name the support that stops a beam moving vertically but lets it slide horizontally and rotate.",
        ["roller"],
        ["pin", "fixed"],
        "A roller support: it pushes at right angles to its surface and nothing more.",
        "One support of a simply supported beam is free to slide so the beam can expand.",
      ),
    ],
    cards: [
      card(
        "A 5 m beam on end supports carries 15 kN at 1 m from the left support. Find the right reaction in kN.",
        3,
        "Moments about the left support: 5R = 15 × 1, so R = 3 kN.",
        "kN",
      ),
      card(
        "A 4 m beam on end supports carries 3 kN/m along its whole length. Find each reaction in kN.",
        6,
        "Total load 12 kN, shared equally by symmetry: 6 kN each.",
        "kN",
      ),
    ],
  },
];
