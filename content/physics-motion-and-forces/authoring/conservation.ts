import {
  power,
  impulse,
  collision,
  beat,
  numeric,
  choose,
  card,
  type TeachingLesson,
} from "./definition.js";
export const conservationLessons: TeachingLesson[] = [
  {
    id: "power-and-efficiency",
    title: "Power and efficiency",
    summary:
      "Separate energy transferred, transfer rate and the fraction reaching a useful output.",
    moduleId: "phys-conservation",
    sourceIds: ["phys-power", "phys-energy"],
    beats: [
      beat(
        "Energy per second",
        "Average power is energy transferred divided by time. A device delivering 1,200 J of useful energy in 4 s has useful output power 300 W. A watt is one joule per second.",
        ["Delivery in 4 s", power(2000, 1200, 4)],
        ["Delivery in 8 s", power(2000, 1200, 8)],
      ),
      beat(
        "Useful output as a fraction",
        "Efficiency compares useful output energy with input energy. Here 1,200 J of useful output from 2,000 J input gives 1,200/2,000 = 0.6, or 60%. Efficiency compares energies over the same operating interval.",
        ["Useful output 1,200 J", power(2000, 1200, 4)],
        ["Useful output 1,600 J", power(2000, 1600, 4)],
      ),
      beat(
        "The remaining energy",
        "Input energy must be accounted for. In a device with no net energy storage, the difference between input and useful output reaches other outputs such as heating or sound. Here that difference is 2,000 − 1,200 = 800 J.",
        ["60% useful", power(2000, 1200, 4)],
        ["80% useful", power(2000, 1600, 4)],
      ),
      beat(
        "Same job, different rate",
        "Delivering the same useful energy in half the time doubles average useful power. It does not by itself improve efficiency: that also depends on input energy. Keep energy, time and useful fraction separate.",
        ["Four-second job", power(2000, 1200, 4)],
        ["Two-second job", power(2000, 1200, 2)],
      ),
    ],
    questions: [
      numeric(
        "A device delivers 1,200 J of useful energy in 4 s. Find its average useful output power in watts.",
        300,
        "P = 1,200/4 = 300 W.",
        [
          "Power measures energy per unit time.",
          "Divide useful energy by the interval.",
          "Calculate 1,200/4.",
        ],
        "W",
      ),
      numeric(
        "A device takes in 2,000 J and delivers 1,200 J as useful energy over the same interval. Find its efficiency as a percentage.",
        60,
        "Efficiency = 100 × 1,200/2,000 = 60%.",
        [
          "Compare useful output with input.",
          "Convert the fraction to a percentage.",
          "Calculate 100 × 0.6.",
        ],
        "%",
      ),
      numeric(
        "A device takes in 2,000 J, provides 1,200 J of useful output and stores no net energy. How many joules leave through its other outputs?",
        800,
        "Other outputs = 2,000 − 1,200 = 800 J.",
        [
          "Account for all the input energy.",
          "Subtract useful output from input.",
          "Calculate 2,000 − 1,200.",
        ],
        "J",
      ),
      choose(
        "A machine delivers the same useful energy in half the time. What happens to its average useful output power?",
        ["It is halved", "It doubles", "It stays the same"],
        1,
        "P = E/t doubles when E stays fixed and t halves.",
        "Keep the energy fixed while changing the denominator.",
      ),
      numeric(
        "A device delivers 350 J of useful output from 500 J input. Find its efficiency as a percentage.",
        70,
        "100 × 350/500 = 70%.",
        [
          "Place useful output in the numerator.",
          "Divide by input, then multiply by 100.",
          "Calculate 100 × 0.7.",
        ],
        "%",
      ),
      choose(
        "A device is claimed to deliver more total output energy than all its input energy, with no decrease in stored energy. What must be checked?",
        [
          "Only the rate of useful energy delivery",
          "Missing inputs, storage changes or incorrect measurements",
          "Only the fraction of output labelled useful",
        ],
        1,
        "Energy conservation requires all inputs, outputs and storage changes to balance.",
        "Draw the system boundary and account for every energy transfer.",
      ),
    ],
    cards: [
      card(
        "A machine delivers 900 J of useful work in 6 s. Find its average useful power in watts.",
        150,
        "P = 900/6 = 150 W.",
        "W",
      ),
      card(
        "A device supplies 540 J of useful output from 720 J input. Find its efficiency as a percentage.",
        75,
        "Efficiency = 100 × 540/720 = 75%.",
        "%",
      ),
    ],
  },
  {
    id: "momentum-and-impulse",
    title: "Momentum and impulse",
    summary: "Track signed momentum and use force acting over time to predict its change.",
    moduleId: "phys-conservation",
    sourceIds: ["phys-momentum", "phys-impulse"],
    beats: [
      beat(
        "Motion with a direction",
        "Linear momentum is p = mv. A 3 kg cart moving right at 4 m/s has momentum +12 kg·m/s when right is positive. Unlike kinetic energy, one-dimensional momentum has a sign that records direction.",
        ["Moving right", impulse(3, 4, 0, 2)],
        ["Moving left", impulse(3, -4, 0, 2)],
      ),
      beat(
        "Force over time",
        "For constant net force, impulse is J = FΔt. It equals the change in momentum. A 6 N net force to the right acting for 3 s adds +18 N·s of impulse, the same as +18 kg·m/s of momentum change.",
        ["Force for 3 s", impulse(3, 4, 6, 3)],
        ["Force for 1 s", impulse(3, 4, 6, 1)],
      ),
      beat(
        "From impulse to velocity",
        "Add impulse to the initial momentum, then divide by mass. For a 3 kg cart initially at 4 m/s, a +18 N·s impulse changes momentum from 12 to 30 kg·m/s and final velocity becomes 10 m/s.",
        ["Push right", impulse(3, 4, 6, 3)],
        ["Push left", impulse(3, 4, -6, 3)],
      ),
      beat(
        "A reversal changes momentum",
        "Equal speeds in opposite directions give equal kinetic energies but opposite momenta. Reversing a 2 kg cart from +4 to −4 m/s changes momentum by −16 kg·m/s, even though its initial and final speeds are equal.",
        ["Reverse direction", impulse(2, 4, -8, 2)],
        ["Leave velocity unchanged", impulse(2, 4, 0, 2)],
      ),
    ],
    questions: [
      numeric(
        "A 3 kg cart moves right at 4 m/s. With right positive, find its momentum in kg·m/s.",
        12,
        "p = 3 × 4 = +12 kg·m/s.",
        [
          "Momentum is mass times signed velocity.",
          "Use positive velocity for rightward motion.",
          "Calculate 3 × 4.",
        ],
        "kg·m/s",
      ),
      numeric(
        "A constant net force of 6 N right acts for 3 s. With right positive, find the impulse in N·s.",
        18,
        "J = FΔt = 6 × 3 = +18 N·s.",
        [
          "Impulse combines net force and its duration.",
          "Multiply force by time.",
          "Calculate 6 × 3.",
        ],
        "N·s",
      ),
      numeric(
        "A 3 kg cart initially moves right at 4 m/s. A net impulse of +18 N·s acts. With right positive, find its final velocity in m/s.",
        10,
        "p_final = 3 × 4 + 18 = 30 kg·m/s; v_final = 30/3 = 10 m/s.",
        [
          "Start with the initial momentum.",
          "Add impulse before dividing by mass.",
          "Calculate (12 + 18)/3.",
        ],
        "m/s",
      ),
      choose(
        "A cart reverses from +4 m/s to −4 m/s without changing mass. Which endpoint quantity is unchanged?",
        ["Signed momentum", "Kinetic energy", "Signed velocity"],
        1,
        "The speed squared is unchanged, so kinetic energy is the same; momentum and velocity reverse signs.",
        "Compare how velocity enters p = mv and K = ½mv².",
      ),
      numeric(
        "A 4 kg cart moving at +6 m/s stops in 3 s. Find the average net force in newtons with right positive.",
        -8,
        "F_avg = Δp/Δt = (0 − 4 × 6)/3 = −8 N.",
        [
          "Stopping reduces the positive momentum to zero.",
          "Divide the signed momentum change by time.",
          "Divide the lost momentum by the stopping time and retain its negative sign.",
        ],
        "N",
      ),
      choose(
        "The same object undergoes the same momentum change over a longer stopping time. What happens to the magnitude of its average net force?",
        ["It increases", "It decreases", "It must stay unchanged"],
        1,
        "The fixed impulse is spread over more time, reducing average force magnitude.",
        "Use F_avg = Δp/Δt with a fixed numerator.",
      ),
    ],
    cards: [
      card(
        "A 4 kg cart has velocity −5 m/s. Find its signed momentum in kg·m/s.",
        -20,
        "p = 4 × (−5) = −20 kg·m/s.",
        "kg·m/s",
      ),
      card(
        "A constant net force of +5 N acts for 2 s. Find its impulse in N·s.",
        10,
        "J = 5 × 2 = +10 N·s.",
        "N·s",
      ),
    ],
  },
  {
    id: "carts-that-stick",
    title: "When carts stick together",
    summary:
      "Conserve signed momentum across a sticking collision and account for the kinetic-energy change.",
    moduleId: "phys-conservation",
    sourceIds: ["phys-conservation", "phys-collision"],
    beats: [
      beat(
        "Choose both carts",
        "During a brief collision with negligible external impulse, total momentum of the two-cart system stays constant. If they stick, both share one final velocity: v = (m_Au_A + m_Bu_B)/(m_A + m_B). Keep each cart's own mass attached to its own velocity.",
        ["Stationary front cart", collision(2, 4, 6, 0)],
        ["Front cart moving right", collision(2, 4, 6, 3)],
      ),
      beat(
        "Opposite momenta can balance",
        "Choose right as positive before adding momenta. A 2 kg cart at +6 m/s and a 4 kg cart at −3 m/s have total momentum 12 − 12 = 0. If they stick with negligible external impulse, their shared final velocity is zero.",
        ["Equal opposing momenta", collision(2, 4, 6, -3)],
        ["Smaller opposing momentum", collision(2, 4, 6, -1)],
      ),
      beat(
        "Momentum is not kinetic energy",
        "A sticking collision conserves total momentum under the stated condition, but converts kinetic energy into deformation, thermal energy and sound. For a 2 kg cart at 6 m/s striking a resting 4 kg cart, initial kinetic energy is 36 J and final kinetic energy is 12 J.",
        ["Different initial velocities", collision(2, 4, 6, 0)],
        ["Closer initial velocities", collision(2, 4, 6, 3)],
      ),
      beat(
        "Check the system boundary",
        "The collision forces are internal to the two-cart system and cancel in its total momentum change. A significant external impulse would change total momentum. We assume that external impulse is negligible during the brief contact, not that every force is absent.",
        ["Same direction", collision(2, 4, 6, 0)],
        ["Opposite directions", collision(2, 4, 6, -3)],
      ),
    ],
    questions: [
      numeric(
        "A 2 kg cart at +6 m/s hits a resting 4 kg cart and they stick. External impulse is negligible. Find their shared final velocity in m/s.",
        2,
        "Total momentum is 2 × 6 + 4 × 0 = 12 kg·m/s; v = 12/(2 + 4) = 2 m/s.",
        [
          "Add both initial signed momenta.",
          "The stuck carts have combined mass 6 kg.",
          "Divide 12 by 6.",
        ],
        "m/s",
      ),
      numeric(
        "A 2 kg cart at +6 m/s and a 4 kg cart at −3 m/s collide and stick. External impulse is negligible. Find their shared final velocity in m/s.",
        0,
        "Initial momentum is 2 × 6 + 4 × (−3) = 0; final velocity is 0 m/s.",
        [
          "Include the negative sign of the second velocity.",
          "Add 12 and −12.",
          "Divide the total momentum by 6 kg.",
        ],
        "m/s",
      ),
      numeric(
        "A 2 kg cart at 6 m/s hits a resting 4 kg cart. They stick and move at 2 m/s. How many joules of kinetic energy are converted into other forms?",
        24,
        "Initial K = ½ × 2 × 6² = 36 J; final K = ½ × 6 × 2² = 12 J; decrease = 24 J.",
        [
          "Calculate kinetic energy before and after contact.",
          "Use the combined mass for the final state.",
          "Subtract 12 J from 36 J.",
        ],
        "J",
      ),
      choose(
        "What condition justifies conserving the total momentum of two colliding carts?",
        [
          "The carts must have equal mass",
          "The external impulse on the two-cart system is negligible",
          "The carts must conserve kinetic energy",
        ],
        1,
        "The total momentum changes by external impulse, so negligible external impulse permits momentum conservation.",
        "Separate internal collision forces from external influences.",
      ),
      numeric(
        "A 3 kg cart at +4 m/s hits a resting 1 kg cart and they stick. External impulse is negligible. Find their shared final velocity in m/s.",
        3,
        "v = (3 × 4 + 1 × 0)/(3 + 1) = 3 m/s.",
        [
          "Find total initial momentum.",
          "Use the combined mass after sticking.",
          "Divide total initial momentum by the combined mass.",
        ],
        "m/s",
      ),
      choose(
        "In an isolated sticking collision, what is conserved across the collision?",
        [
          "Total momentum; kinetic energy may become other forms",
          "Each cart's individual momentum",
          "Kinetic energy, but not total momentum",
        ],
        0,
        "Internal forces exchange momentum between carts; total momentum remains fixed while some kinetic energy becomes other forms.",
        "Apply the conservation rule to the whole system.",
      ),
    ],
    cards: [
      card(
        "A 2 kg cart at +8 m/s hits a resting 6 kg cart and they stick. External impulse is negligible. Find their shared final velocity in m/s.",
        2,
        "v = (2 × 8)/(2 + 6) = 2 m/s.",
        "m/s",
      ),
      card(
        "A 4 kg cart at +5 m/s meets a 2 kg cart at −4 m/s. They stick with negligible external impulse. Find their shared final velocity in m/s.",
        2,
        "v = (4 × 5 + 2 × (−4))/(4 + 2) = 12/6 = 2 m/s.",
        "m/s",
      ),
    ],
  },
];
