import { trip, beat, numeric, choose, card, type TeachingLesson } from "./definition.js";
export const motionLessons: TeachingLesson[] = [
  {
    id: "measuring-motion",
    title: "Where did it go?",
    summary: "Distinguish a change in position from the total distance travelled.",
    moduleId: "phys-observe",
    sourceIds: ["phys-displacement"],
    beats: [
      beat(
        "Choose a positive direction",
        "Position is measured from a chosen origin. With right positive, displacement is final position minus initial position. A move from 2 m to 9 m has displacement +7 m; the sign records its direction.",
        [
          "Move right",
          trip([
            [0, 2],
            [4, 9],
          ]),
        ],
        [
          "Move left",
          trip([
            [0, 2],
            [4, -3],
          ]),
        ],
      ),
      beat(
        "Return to the start",
        "The length of a trip counts every part of the path. Returning to the starting position gives zero displacement even though the object has travelled. Follow the dot out and back before comparing the endpoints.",
        [
          "Out and back",
          trip([
            [0, 1],
            [2, 7],
            [4, 1],
          ]),
        ],
        [
          "One way",
          trip([
            [0, 1],
            [4, 7],
          ]),
        ],
      ),
      beat(
        "Move the origin",
        "Changing the origin changes both position readings by the same amount. Their difference stays the same. The physical trip does not become longer when you rename the starting coordinate.",
        [
          "Start at 2 m",
          trip([
            [0, 2],
            [3, 9],
          ]),
        ],
        [
          "Start at 12 m",
          trip([
            [0, 12],
            [3, 19],
          ]),
        ],
      ),
      beat(
        "Count a reversal",
        "A reversal creates another stretch of travel. From 0 m to 8 m and then back to 3 m, the distance is 8 + 5 = 13 m. The displacement uses only the endpoints: +3 m.",
        [
          "Turn back",
          trip([
            [0, 0],
            [3, 8],
            [5, 3],
          ]),
        ],
        [
          "Straight to 3 m",
          trip([
            [0, 0],
            [5, 3],
          ]),
        ],
      ),
    ],
    questions: [
      numeric(
        "An object moves from x = 2 m to x = 9 m. With right positive, what is its displacement in metres?",
        7,
        "Displacement = 9 − 2 = +7 m.",
        [
          "Locate the starting and finishing coordinates.",
          "Subtract the start from the finish.",
          "Calculate 9 − 2.",
        ],
        "m",
      ),
      numeric(
        "A cart goes from 1 m to 7 m and back to 1 m. What total distance does it travel, in metres?",
        12,
        "It travels 6 m out and 6 m back, for 12 m.",
        [
          "Count both stretches of the trip.",
          "Each stretch has length 7 − 1 metres.",
          "Add (7 − 1) + (7 − 1).",
        ],
        "m",
      ),
      choose(
        "The origin shifts so that a trip from 2 m to 9 m is recorded as 12 m to 19 m. What happens to the displacement?",
        ["It becomes 10 m larger", "It stays the same", "It doubles"],
        1,
        "Both readings increase by 10 m; their difference stays +7 m.",
        "Compare the differences between the two pairs of endpoints.",
      ),
      numeric(
        "A robot moves from 0 m to 8 m, then back to 3 m. How far does it travel altogether, in metres?",
        13,
        "The path has lengths 8 m and 5 m: 8 + 5 = 13 m.",
        [
          "Break the trip at the turning point.",
          "The return stretch runs from 8 m to 3 m.",
          "Add 8 + (8 − 3).",
        ],
        "m",
      ),
      numeric(
        "A lift's marked position changes from 5 m to −4 m. With upward positive, find its displacement in metres.",
        -9,
        "Final minus initial gives −4 − 5 = −9 m, downward.",
        [
          "Keep the minus sign on the final position.",
          "Subtract the initial position from the final position.",
          "Calculate −4 − 5.",
        ],
        "m",
      ),
      choose(
        "A cart travels from −2 m to 4 m and then to 1 m. Which statement describes its trip?",
        [
          "Displacement 9 m; distance 3 m",
          "Displacement 3 m; distance 9 m",
          "Displacement −3 m; distance 9 m",
        ],
        1,
        "Its displacement is 1 − (−2) = 3 m. Its distance is 6 + 3 = 9 m.",
        "Use endpoints for displacement and both path lengths for distance.",
      ),
    ],
    cards: [
      card(
        "A marker moves from −3 m to 6 m. What is its signed displacement in metres?",
        9,
        "6 − (−3) = +9 m.",
        "m",
      ),
      card(
        "A robot travels from 2 m to 10 m, then returns to 5 m. Find its total distance in metres.",
        13,
        "The two lengths are 8 m and 5 m, totalling 13 m.",
        "m",
      ),
    ],
  },
  {
    id: "speed-and-direction",
    title: "Speed and direction",
    summary: "Use elapsed time to distinguish average speed from average velocity.",
    moduleId: "phys-observe",
    sourceIds: ["phys-velocity"],
    beats: [
      beat(
        "How much each second?",
        "Average speed divides total distance by elapsed time. Travelling 18 m in 6 s gives 3 m/s. That average describes the whole interval; it does not establish that the object moved equally fast at every moment.",
        [
          "18 m in 6 s",
          trip([
            [0, 0],
            [6, 18],
          ]),
        ],
        [
          "18 m in 3 s",
          trip([
            [0, 0],
            [3, 18],
          ]),
        ],
      ),
      beat(
        "Keep the direction",
        "Average velocity divides signed displacement by elapsed time. A displacement of −12 m over 3 s gives −4 m/s. Speed uses a magnitude, so a negative velocity still describes positive speed.",
        [
          "Leftward",
          trip([
            [0, 0],
            [3, -12],
          ]),
        ],
        [
          "Rightward",
          trip([
            [0, 0],
            [3, 12],
          ]),
        ],
      ),
      beat(
        "One trip, two averages",
        "A return trip can have zero average velocity. The final position equals the initial position, so their difference is zero. Average speed still counts the full distance travelled during the interval.",
        [
          "Return in 5 s",
          trip([
            [0, 0],
            [2, 10],
            [5, 0],
          ]),
        ],
        [
          "Finish away",
          trip([
            [0, 0],
            [2, 10],
            [5, 20],
          ]),
        ],
      ),
      beat(
        "Combine unequal times",
        "To average a whole trip, divide its total distance by its total time. Travelling 6 m in 2 s and another 6 m in 4 s gives 12/6 = 2 m/s. An ordinary average of the two speeds would give the wrong weighting.",
        [
          "Slow second stretch",
          trip([
            [0, 0],
            [2, 6],
            [6, 12],
          ]),
        ],
        [
          "Equal time stretches",
          trip([
            [0, 0],
            [2, 6],
            [4, 12],
          ]),
        ],
      ),
    ],
    questions: [
      numeric(
        "A rover covers 18 m in 6 s without reversing. What is its average speed in m/s?",
        3,
        "Average speed = 18/6 = 3 m/s.",
        [
          "Use total distance and elapsed time.",
          "Divide distance by time.",
          "Share the travelled distance equally across the elapsed seconds.",
        ],
        "m/s",
      ),
      numeric(
        "A cart's displacement is −12 m over 3 s. Find its average velocity in m/s.",
        -4,
        "Average velocity = −12/3 = −4 m/s.",
        [
          "Velocity keeps the direction of displacement.",
          "Divide the signed displacement by elapsed time.",
          "Divide the displacement magnitude by duration and keep its negative sign.",
        ],
        "m/s",
      ),
      numeric(
        "A runner goes 10 m from a marker and returns to that marker in a total of 5 s. Find the average velocity in m/s.",
        0,
        "The displacement is zero, so average velocity is 0/5 = 0 m/s.",
        "Use the final and initial positions.|A return to the same point leaves no displacement.|Divide that displacement by the total time.".split(
          "|",
        ) as [string, string, string],
        "m/s",
      ),
      choose(
        "A robot travels 6 m in 2 s, then 6 m in 4 s. What is its average speed for the whole trip?",
        ["2 m/s", "2.25 m/s", "3 m/s"],
        0,
        "The whole trip is 12 m in 6 s, giving 2 m/s. The slower section lasts longer.",
        "Combine distances and times before dividing.",
      ),
      numeric(
        "A conveyor moves a parcel 42 m along a straight path in 7 s. What is its average speed in m/s?",
        6,
        "42/7 = 6 m/s.",
        [
          "Identify the path length and duration.",
          "Use distance divided by time.",
          "Find how many metres correspond to one second.",
        ],
        "m/s",
      ),
      choose(
        "A moving object returns to its start. Which average must be zero over the complete trip?",
        ["Average speed", "Average velocity", "Both averages"],
        1,
        "Only average velocity must be zero, because displacement is zero. The distance travelled is positive.",
        "Ask which average uses displacement.",
      ),
    ],
    cards: [
      card(
        "A trolley travels 35 m without reversing in 5 s. Find its average speed in m/s.",
        7,
        "Average speed = 35/5 = 7 m/s.",
        "m/s",
      ),
      card(
        "A robot's signed displacement is −24 m over 8 s. Find its average velocity in m/s.",
        -3,
        "Average velocity = −24/8 = −3 m/s.",
        "m/s",
      ),
    ],
  },
  {
    id: "reading-motion-graphs",
    title: "Read a motion graph",
    summary: "Interpret a position–time graph as changing position, pauses and reversals.",
    moduleId: "phys-observe",
    sourceIds: ["phys-graphs", "phys-velocity"],
    beats: [
      beat(
        "The slope tells a rate",
        "A position–time graph puts time on the horizontal axis. Along a straight segment, divide the position change by the time change to get velocity. From 2 m to 14 m in 3 s, that slope is +4 m/s.",
        [
          "Rising line",
          trip(
            [
              [0, 2],
              [3, 14],
            ],
            "position_graph",
          ),
        ],
        [
          "Shallower line",
          trip(
            [
              [0, 2],
              [3, 8],
            ],
            "position_graph",
          ),
        ],
      ),
      beat(
        "A flat line is a pause",
        "A horizontal segment holds the same position while time passes. Its velocity is zero. The graph represents position over time, so a flat segment is a pause rather than a picture of a level road.",
        [
          "Pause at 8 m",
          trip(
            [
              [0, 0],
              [2, 8],
              [4, 8],
              [6, 2],
            ],
            "position_graph",
          ),
        ],
        [
          "Keep moving",
          trip(
            [
              [0, 0],
              [2, 8],
              [4, 16],
              [6, 24],
            ],
            "position_graph",
          ),
        ],
      ),
      beat(
        "A downward slope",
        "A downward segment means position decreases as time increases. With right positive, that is leftward velocity. It does not mean the object is below the ground or falling through the page.",
        [
          "Return left",
          trip(
            [
              [0, 10],
              [4, 2],
            ],
            "position_graph",
          ),
        ],
        [
          "Continue right",
          trip(
            [
              [0, 2],
              [4, 10],
            ],
            "position_graph",
          ),
        ],
      ),
      beat(
        "Read the whole interval",
        "For average velocity over several segments, use the overall endpoints. The pause and reversal still contribute elapsed time. Moving from 0 m to 2 m over 6 s gives an average velocity of one-third of a metre per second.",
        [
          "Pause and return",
          trip(
            [
              [0, 0],
              [2, 8],
              [4, 8],
              [6, 2],
            ],
            "position_graph",
          ),
        ],
        [
          "Steady progress",
          trip(
            [
              [0, 0],
              [6, 2],
            ],
            "position_graph",
          ),
        ],
      ),
    ],
    questions: [
      numeric(
        "A straight position–time segment goes from 2 m at 0 s to 14 m at 3 s. What velocity does it show, in m/s?",
        4,
        "The slope is (14 − 2)/(3 − 0) = 4 m/s.",
        [
          "Read the changes on both axes.",
          "Divide position change by time change.",
          "Calculate (14 − 2)/3.",
        ],
        "m/s",
      ),
      choose(
        "A position–time graph is horizontal from 2 s to 4 s. What does the object do during that interval?",
        [
          "Stays at the same position",
          "Moves at a positive constant speed",
          "Accelerates to the right",
        ],
        0,
        "Position stays fixed during the interval, so the object is stationary.",
        "Compare the position at the ends of the horizontal segment.",
      ),
      numeric(
        "Position falls from 10 m to 2 m along a straight graph segment lasting 4 s. Find the velocity in m/s.",
        -2,
        "Velocity = (2 − 10)/4 = −2 m/s.",
        [
          "A falling position reading has a negative change.",
          "Use final position minus initial position.",
          "Calculate (2 − 10)/4.",
        ],
        "m/s",
      ),
      numeric(
        "A graph starts at 0 m at 0 s and finishes at 2 m at 6 s, with a pause and reversal between. Find the overall average velocity in m/s; a fraction is accepted.",
        1 / 3,
        "Overall displacement is 2 m over 6 s: 2/6 = 1/3 m/s.",
        [
          "Use the outer endpoints for the full interval.",
          "Include the entire elapsed time, including the pause.",
          "Divide 2 by 6.",
        ],
        "m/s",
      ),
      numeric(
        "A straight graph segment runs from x = 3 m at t = 1 s to x = 15 m at t = 4 s. Find its velocity in m/s.",
        4,
        "Position change is 12 m and time change is 3 s: 12/3 = 4 m/s.",
        [
          "Subtract the earlier reading from the later reading on each axis.",
          "Subtract the earlier time from the later time.",
          "Divide the change in position by the change in time.",
        ],
        "m/s",
      ),
      choose(
        "What does a straight rising line on a position–time graph indicate?",
        ["Constant positive velocity", "A path that slopes uphill", "Increasing velocity"],
        0,
        "Equal time intervals produce equal positive position changes, which is constant positive velocity.",
        "A graph of position against time shows a rate, not the shape of the road.",
      ),
    ],
    cards: [
      card(
        "A straight position–time line runs from −3 m at 0 s to 9 m at 4 s. Find its velocity in m/s.",
        3,
        "The slope is (9 − (−3))/4 = 3 m/s.",
        "m/s",
      ),
      card(
        "A straight position–time segment moves from 8 m to −4 m in 3 s. Find the velocity in m/s.",
        -4,
        "Velocity = (−4 − 8)/3 = −4 m/s.",
        "m/s",
      ),
    ],
  },
];
