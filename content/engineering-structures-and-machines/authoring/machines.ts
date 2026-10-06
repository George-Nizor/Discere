import {
  beat,
  card,
  choose,
  gears,
  lever,
  numeric,
  pulley,
  word,
  type TeachingLesson,
} from "./definition.js";

export const machineLessons: TeachingLesson[] = [
  {
    id: "levers-and-pulleys",
    title: "Levers and pulleys",
    summary: "Trade distance for force with levers and rope systems, and count what it costs.",
    moduleId: "engr-machines",
    sourceIds: ["engr-cp-machines", "engr-up-torque"],
    beats: [
      beat(
        "Trade distance for force",
        "Mechanical advantage is output force divided by input force. For a lever balanced about its fulcrum, effort × effort arm = load × load arm, so MA = effort arm/load arm = 1.2/0.2 = 6. The hand moves six times as far as the load. The lever trades distance for force; it creates no energy.",
        ["Crowbar, 1.2 m handle", lever("first", 1.2, 0.2, 900)],
        ["Crowbar, 0.6 m handle", lever("first", 0.6, 0.2, 900)],
      ),
      beat(
        "Effort and the three classes",
        "Effort = load × load arm/effort arm = 900 × 0.2/1.2 = 150 N. Halve the handle to 0.6 m and the effort doubles. A wheelbarrow, with the load between wheel and handles, is a second-class lever and also gains force. Tweezers and the forearm put the effort in the middle: third-class levers that give up force for speed and reach.",
        ["First class: crowbar", lever("first", 1.2, 0.2, 900)],
        ["Second class: wheelbarrow", lever("second", 1.2, 0.4, 900)],
        ["Third class: forearm", lever("third", 0.04, 0.32, 50)],
      ),
      beat(
        "Strands share the load",
        "In a block and tackle one continuous rope runs over several pulleys. Each strand supporting the moving block carries the same tension, so n strands share the load: effort = load/n. Four strands hold 800 N with 200 N in the rope. Count only the strands attached to, or running round, the moving block.",
        ["4 strands", pulley(4, 800, 0.5)],
        ["2 strands", pulley(2, 800, 0.5)],
      ),
      beat(
        "Work in equals work out",
        "Raising the block 0.5 m shortens each of the 4 strands by 0.5 m, so 2 m of rope passes through the hand. Work in, 200 N × 2 m = 400 J, equals work out, 800 N × 0.5 m = 400 J. An ideal machine conserves force × distance; a real one returns less, as the last lesson measures.",
        ["4 strands", pulley(4, 800, 0.5)],
        ["2 strands", pulley(2, 800, 0.5)],
      ),
    ],
    questions: [
      numeric(
        "A crowbar is levered over a fulcrum. The hand pushes 1.2 m from the fulcrum and the load sits 0.2 m from it. Find the mechanical advantage.",
        6,
        "MA = effort arm ÷ load arm = 1.2 ÷ 0.2 = 6.",
        [
          "Mechanical advantage is load force over effort force.",
          "For a balanced lever, that equals the ratio of the arms.",
          "Calculate 1.2 ÷ 0.2.",
        ],
        "",
      ),
      numeric(
        "With the same crowbar, find the effort in newtons needed to hold a 900 N load.",
        150,
        "Effort = 900 × 0.2 ÷ 1.2 = 150 N.",
        [
          "Moments about the fulcrum must balance.",
          "Effort × 1.2 = 900 × 0.2.",
          "Calculate 180 ÷ 1.2.",
        ],
        "N",
      ),
      numeric(
        "A pulley system has 4 rope strands supporting the moving block, which carries an 800 N load. Ignoring friction and the block's weight, find the effort in newtons.",
        200,
        "Each of the 4 strands carries the rope tension: effort = 800 ÷ 4 = 200 N.",
        [
          "The rope tension is the same in every strand.",
          "The supporting strands share the load equally.",
          "Calculate 800 ÷ 4.",
        ],
        "N",
      ),
      numeric(
        "To lift that load 0.5 m with 4 supporting strands, how many metres of rope must be pulled?",
        2,
        "Each strand shortens by 0.5 m: 4 × 0.5 = 2 m.",
        [
          "Every supporting strand gets shorter by the lift height.",
          "The rope taken up comes out through the hand.",
          "Calculate 4 × 0.5.",
        ],
        "m",
      ),
      numeric(
        "In the forearm, the biceps attaches 0.04 m from the elbow, and a 50 N weight is held in the hand 0.32 m from the elbow. Treating the forearm as a weightless horizontal lever, find the biceps force in newtons.",
        400,
        "Biceps × 0.04 = 50 × 0.32, so the biceps pulls 16 ÷ 0.04 = 400 N, eight times the weight held.",
        [
          "The elbow is the fulcrum.",
          "Balance moments: effort × effort arm = load × load arm.",
          "Calculate 50 × 0.32 ÷ 0.04.",
        ],
        "N",
      ),
      word(
        "A wheelbarrow has its load between the wheel axle and the handles. Which class of lever is it: first, second or third?",
        ["second"],
        ["first", "third"],
        "Second class: the load sits between the fulcrum and the effort.",
        "Locate the fulcrum first, then see which of load and effort lies between.",
      ),
    ],
    cards: [
      card(
        "A lever has an effort arm of 1.5 m and a load arm of 0.3 m. Find the effort, in N, that holds a 1,000 N load.",
        200,
        "1,000 × 0.3 ÷ 1.5 = 200 N.",
        "N",
      ),
      card(
        "An ideal pulley system with 6 supporting strands lifts a 1,500 N load. Find the effort in N.",
        250,
        "1,500 ÷ 6 = 250 N.",
        "N",
      ),
    ],
  },
  {
    id: "gear-trains",
    title: "Gear trains: speed and torque",
    summary:
      "Use tooth counts to find speed, torque and direction through simple and compound trains.",
    moduleId: "engr-machines",
    sourceIds: ["engr-up-rotation", "engr-up-rotational-power"],
    beats: [
      beat(
        "Teeth set the ratio",
        "Meshing teeth pass the contact point at the same rate, so speed × teeth is the same on both gears. The 60-tooth gear turns 20/60 as fast as the 20-tooth driver: 1,200 × 20/60 = 400 rpm. The gear ratio, driven teeth over driver teeth, is 3 : 1. The larger wheel always turns more slowly.",
        ["20 teeth driving 60", gears([[20, 60]], 1200, 10)],
        ["20 teeth driving 40", gears([[20, 40]], 1200, 10)],
      ),
      beat(
        "Torque goes the other way",
        "Power is torque times angular speed, and an ideal mesh passes all of it on. Slow the shaft by a factor of 3 and its torque rises by 3: 10 × 3 = 30 N·m. A gearbox exchanges speed for torque in the same way a lever exchanges distance for force.",
        ["3 : 1 reduction", gears([[20, 60]], 1200, 10)],
        ["2 : 1 reduction", gears([[20, 40]], 1200, 10)],
      ),
      beat(
        "Idlers change direction, not ratio",
        "An idler sits between two gears. Its own speed follows the usual rule, 1,200 × 20/30 = 800 rpm, but its tooth count cancels from the overall ratio: 1,200 × 20/30 × 30/60 is still 400 rpm. What changes is direction. Each external mesh reverses rotation, so with two meshes the output turns the same way as the driver. Idlers also bridge a gap between shafts.",
        ["With a 30-tooth idler", gears([[20, 60]], 1200, 10, 1, 30)],
        ["Direct mesh", gears([[20, 60]], 1200, 10)],
      ),
      beat(
        "Compound trains multiply",
        "In a compound train two gears share a shaft, so the stage ratios multiply: 45/15 × 60/20 = 3 × 3 = 9, and 1,800 rpm becomes 200 rpm. A single pair giving 9 : 1 would need a 135-tooth wheel against a 15-tooth pinion. Two stages fit the same reduction into a much smaller box.",
        [
          "Two stages of 3 : 1",
          gears(
            [
              [15, 45],
              [20, 60],
            ],
            1800,
            5,
          ),
        ],
        ["One stage of 3 : 1", gears([[15, 45]], 1800, 5)],
      ),
    ],
    questions: [
      numeric(
        "A 20-tooth driver gear turning at 1,200 rpm meshes with a 60-tooth gear. Find the output speed in rpm.",
        400,
        "Output speed = 1,200 × 20 ÷ 60 = 400 rpm. Multiplying by 60/20 instead would speed the larger gear up.",
        [
          "Speed × teeth is equal on both gears.",
          "The bigger gear turns more slowly.",
          "Calculate 1,200 × 20 ÷ 60.",
        ],
        "rpm",
      ),
      numeric(
        "If the 20-tooth driver supplies 10 N·m and the mesh is lossless, find the output torque on the 60-tooth gear in N·m.",
        30,
        "Torque rises by the ratio 60/20 = 3: 10 × 3 = 30 N·m.",
        [
          "An ideal mesh passes on all the power.",
          "Speed falls by the gear ratio, so torque rises by it.",
          "Calculate 10 × 60 ÷ 20.",
        ],
        "N·m",
      ),
      numeric(
        "A 30-tooth idler is placed between the 20-tooth driver, turning at 1,200 rpm, and the 60-tooth output. Find the idler's speed in rpm.",
        800,
        "The idler meshes with the driver: 1,200 × 20 ÷ 30 = 800 rpm. The output still turns at 1,200 × 20 ÷ 60 = 400 rpm.",
        [
          "The idler is driven directly by the 20-tooth gear.",
          "Speed × teeth is equal across that mesh.",
          "Calculate 1,200 × 20 ÷ 30.",
        ],
        "rpm",
      ),
      numeric(
        "A compound train has 15 teeth driving 45, then, on the same shaft, 20 teeth driving 60. The input turns at 1,800 rpm. Find the output speed in rpm.",
        200,
        "Overall ratio = (45/15) × (60/20) = 9; output = 1,800 ÷ 9 = 200 rpm.",
        [
          "Find each stage's ratio, driven over driver.",
          "Multiply the stage ratios for a compound train.",
          "Calculate 1,800 ÷ (3 × 3).",
        ],
        "rpm",
      ),
      numeric(
        "A bicycle's 48-tooth chainring drives a 16-tooth rear sprocket. The pedals turn at 60 rpm. Find the rear wheel's speed in rpm.",
        180,
        "A chain works like a mesh: 60 × 48 ÷ 16 = 180 rpm. Here the smaller sprocket is driven, so it turns faster.",
        [
          "The chain carries teeth past both sprockets at the same rate.",
          "Speed × teeth is equal on both.",
          "Calculate 60 × 48 ÷ 16.",
        ],
        "rpm",
      ),
      word(
        "A 20-tooth driver turns a 60-tooth output through a 30-tooth idler. Compared with the driver, which way does the output turn: same or opposite?",
        ["same"],
        ["opposite"],
        "The same way: each external mesh reverses rotation, and there are two meshes.",
        "Each pair of meshing external gears turns in opposite senses. Count the meshes.",
      ),
    ],
    cards: [
      card(
        "A 25-tooth driver at 900 rpm meshes with a 75-tooth gear. Find the output speed in rpm.",
        300,
        "900 × 25 ÷ 75 = 300 rpm.",
        "rpm",
      ),
      card(
        "A lossless gearbox reduces speed by 4 : 1. The input torque is 12 N·m. Find the output torque in N·m.",
        48,
        "12 × 4 = 48 N·m.",
        "N·m",
      ),
    ],
  },
  {
    id: "efficiency-and-power",
    title: "Efficiency and power in a drive",
    summary: "Track power through a drive, account for losses and size a motor for a hoist.",
    moduleId: "engr-machines",
    sourceIds: ["engr-up-rotational-power", "engr-cp-power"],
    beats: [
      beat(
        "Power is torque times angular speed",
        "Rotational power is torque times angular speed, P = Tω, with ω in radians per second. 1,500 rpm is 1,500 × 2π/60 = 157.1 rad/s, so P = 20 × 157.1 ≈ 3,142 W. The rpm-to-rad/s conversion is the step most often missed; leaving it out gives an answer nearly ten times too large.",
        ["20 N·m at 1,500 rpm", gears([[20, 60]], 1500, 20, 0.95)],
        ["20 N·m at 750 rpm", gears([[20, 60]], 750, 20, 0.95)],
      ),
      beat(
        "Losses multiply",
        "Each mesh loses a little power to friction and oil churning, and losses compound: overall efficiency is the product of the stage efficiencies. 0.95 × 0.95 = 0.9025, so 90.25% of the input reaches the output. Every extra stage costs another few per cent; three stages at 95% would deliver about 86%.",
        [
          "Two stages at 95%",
          gears(
            [
              [15, 45],
              [20, 60],
            ],
            1500,
            20,
            0.95,
          ),
        ],
        ["One stage at 95%", gears([[15, 45]], 1500, 20, 0.95)],
      ),
      beat(
        "Losses cost torque, not ratio",
        "Teeth cannot slip, so the output of a 4 : 1 gearbox still turns at exactly a quarter of the input speed. The missing power shows up as lost torque instead. The ideal output would be 20 × 4 = 80 N·m; at 90% efficiency the shaft delivers 72 N·m.",
        ["90% efficient mesh", gears([[15, 60]], 1500, 20, 0.9)],
        ["Ideal mesh", gears([[15, 60]], 1500, 20, 1)],
      ),
      beat(
        "Size the motor",
        "Size a motor from the useful output. Lifting 2,000 N at 0.5 m/s needs 1,000 W at the hook; at 80% efficiency the motor must supply 1,250 W. A smaller motor can lift the same load, only more slowly. More strands or stages lower the effort but add friction, and the motor still supplies every watt.",
        ["4 strands, 80% efficient", pulley(4, 2000, 2, 0.8, 0.5)],
        ["2 strands, 90% efficient", pulley(2, 2000, 2, 0.9, 0.5)],
      ),
    ],
    questions: [
      numeric(
        "A motor delivers 20 N·m at 1,500 rpm. Find its power output in watts, to the nearest watt.",
        1000 * Math.PI,
        "ω = 1,500 × 2π ÷ 60 = 157.08 rad/s; P = 20 × 157.08 = 3,141.6 W, so about 3,142 W.",
        [
          "Convert rpm to radians per second: multiply by 2π and divide by 60.",
          "Power is torque times angular speed.",
          "Calculate 20 × 1,500 × 2π ÷ 60 and round.",
        ],
        "W",
        0.6,
      ),
      numeric(
        "A gearbox has two meshes, each 95% efficient. Find the overall efficiency as a percentage.",
        90.25,
        "0.95 × 0.95 = 0.9025, which is 90.25%. Subtracting 5% twice gives 90%, slightly too low.",
        [
          "Each stage passes on a fraction of what it receives.",
          "Multiply the stage efficiencies as decimals.",
          "Calculate 0.95², then convert to a percentage.",
        ],
        "%",
      ),
      numeric(
        "A single-stage gearbox with a 4 : 1 reduction is 90% efficient. The input torque is 20 N·m. Find the output torque in N·m.",
        72,
        "Ideal output 20 × 4 = 80 N·m; with losses 80 × 0.9 = 72 N·m.",
        [
          "Start from the ideal torque multiplication.",
          "Losses reduce torque because the speed ratio is fixed by the teeth.",
          "Calculate 20 × 4 × 0.9.",
        ],
        "N·m",
      ),
      numeric(
        "A hoist lifts 2,000 N at 0.5 m/s through a pulley system that is 80% efficient overall. Find the power the motor must supply, in watts.",
        1250,
        "Useful power = 2,000 × 0.5 = 1,000 W; input = 1,000 ÷ 0.8 = 1,250 W.",
        [
          "Useful power is force times speed.",
          "Input power is useful power divided by efficiency.",
          "Calculate 2,000 × 0.5 ÷ 0.8.",
        ],
        "W",
      ),
      numeric(
        "A block and tackle with 4 supporting strands is 80% efficient. Find the effort needed to raise a 1,600 N load, in N.",
        500,
        "Actual mechanical advantage = 4 × 0.8 = 3.2; effort = 1,600 ÷ 3.2 = 500 N.",
        [
          "The ideal effort is load divided by the number of strands.",
          "Friction means the real effort is larger: divide by the efficiency too.",
          "Calculate 1,600 ÷ (4 × 0.8).",
        ],
        "N",
      ),
      choose(
        "A designer adds a third reduction stage so that the same motor delivers more output torque. What is given up?",
        ["Output speed, plus a little extra loss", "Input power", "Nothing: the torque comes free"],
        0,
        "More reduction multiplies torque by slowing the output, and each extra mesh wastes a few more per cent of the power.",
        "Output power can never exceed input power.",
      ),
    ],
    cards: [
      card(
        "A shaft carries 25 N·m at 100 rad/s. Find the power in watts.",
        2500,
        "P = Tω = 25 × 100 = 2,500 W.",
        "W",
      ),
      card(
        "A motor supplies 4 kW to a drive that is 85% efficient. Find the output power in kW.",
        3.4,
        "4 × 0.85 = 3.4 kW.",
        "kW",
      ),
    ],
  },
];
