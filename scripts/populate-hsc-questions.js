#!/usr/bin/env node

/**
 * HSC Questions Population Script
 * 
 * This script populates the hsc_questions table with sample math questions.
 * 
 * Usage: node scripts/populate-hsc-questions.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const SAMPLE_QUESTIONS = [
  {
    grade: 'Year 12',
    year: 2024,
    subject: 'Mathematics Extension 2',
    topic: 'Complex Numbers',
    marks: 4,
    question_text: `The complex number $z$ is given by $z = \\sqrt{3} + i$.

(i) Find the modulus and argument of $z$.

(ii) Hence, show that $z^{6}$ is real and find its value.

(iii) Find the least positive integer $n$ such that $z^{n}$ is purely imaginary.`,
    marking_criteria: `(i) Correct modulus and argument: 1 mark
(ii) Correct application of De Moivre's Theorem and calculation: 2 marks
(iii) Correct identification of $n = 3$: 1 mark`,
    sample_answer: `(i) $|z| = \\sqrt{3 + 1} = 2$ and $\\arg(z) = \\arctan(\\frac{1}{\\sqrt{3}}) = \\frac{\\pi}{6}$.

(ii) Using De Moivre's Theorem: $z^6 = 2^6(\\cos(6 \\cdot \\frac{\\pi}{6}) + i\\sin(6 \\cdot \\frac{\\pi}{6})) = 64(\\cos(\\pi) + i\\sin(\\pi)) = 64(-1) = -64$.

(iii) For $z^n$ to be purely imaginary, the real part must be zero. $z^n = 2^n(\\cos(\\frac{n\\pi}{6}) + i\\sin(\\frac{n\\pi}{6}))$. We need $\\cos(\\frac{n\\pi}{6}) = 0$, which gives $\\frac{n\\pi}{6} = \\frac{\\pi}{2}$, so $n = 3$.`
  },
  {
    grade: 'Year 12',
    year: 2024,
    subject: 'Mathematics Advanced',
    topic: 'Calculus - Differentiation',
    marks: 3,
    question_text: `Consider the function $f(x) = x^3 - 6x^2 + 9x$.

(i) Find the coordinates of the stationary points.

(ii) Determine whether each stationary point is a maximum or minimum.`,
    marking_criteria: `(i) Correct stationary points: 1.5 marks
(ii) Correct classification of each point: 1.5 marks`,
    sample_answer: `(i) $f'(x) = 3x^2 - 12x + 9 = 3(x^2 - 4x + 3) = 3(x-1)(x-3) = 0$. So $x = 1$ or $x = 3$.
When $x = 1$: $f(1) = 1 - 6 + 9 = 4$. When $x = 3$: $f(3) = 27 - 54 + 27 = 0$.
Stationary points are $(1, 4)$ and $(3, 0)$.

(ii) $f''(x) = 6x - 12$. At $x = 1$: $f''(1) = -6 < 0$, so $(1, 4)$ is a local maximum.
At $x = 3$: $f''(3) = 6 > 0$, so $(3, 0)$ is a local minimum.`
  },
  {
    grade: 'Year 12',
    year: 2024,
    subject: 'Mathematics Extension 1',
    topic: 'Trigonometric Equations',
    marks: 4,
    question_text: `Solve the equation $\\sin(2x) = \\cos(x)$ for $0 \\leq x \\leq 2\\pi$.`,
    marking_criteria: `Correct setup and method: 1 mark
Each correct solution: 0.75 marks (4 solutions expected)`,
    sample_answer: `$\\sin(2x) = \\cos(x) \\Rightarrow 2\\sin(x)\\cos(x) = \\cos(x)$.
$\\cos(x)(2\\sin(x) - 1) = 0$.
So $\\cos(x) = 0$ or $\\sin(x) = \\frac{1}{2}$.

$\\cos(x) = 0 \\Rightarrow x = \\frac{\\pi}{2}, \\frac{3\\pi}{2}$.
$\\sin(x) = \\frac{1}{2} \\Rightarrow x = \\frac{\\pi}{6}, \\frac{5\\pi}{6}$.

Solutions: $x = \\frac{\\pi}{6}, \\frac{\\pi}{2}, \\frac{5\\pi}{6}, \\frac{3\\pi}{2}$.`
  },
  {
    grade: 'Year 12',
    year: 2024,
    subject: 'Mathematics Advanced',
    topic: 'Calculus - Differentiation',
    marks: 2,
    question_text: `Differentiate $y = e^{x} \\ln(x)$ with respect to $x$.`,
    marking_criteria: `Correct use of product rule and derivatives: 2 marks`,
    sample_answer: `Using the product rule: $\\frac{dy}{dx} = e^x \\cdot \\ln(x) + e^x \\cdot \\frac{1}{x} = e^x(\\ln(x) + \\frac{1}{x})$.`
  },
  {
    grade: 'Year 12',
    year: 2024,
    subject: 'Mathematics Extension 2',
    topic: 'Integration',
    marks: 5,
    question_text: `Find the area enclosed between the curves $y = x^2$ and $y = 4 - x^2$.`,
    marking_criteria: `Finding intersection points: 1 mark
Setting up integral: 1.5 marks
Correct evaluation: 2.5 marks`,
    sample_answer: `Setting $x^2 = 4 - x^2$ gives $2x^2 = 4$, so $x = \\pm\\sqrt{2}$.

Area $= \\int_{-\\sqrt{2}}^{\\sqrt{2}} [(4 - x^2) - x^2] dx = \\int_{-\\sqrt{2}}^{\\sqrt{2}} (4 - 2x^2) dx$
$= [4x - \\frac{2x^3}{3}]_{-\\sqrt{2}}^{\\sqrt{2}} = (4\\sqrt{2} - \\frac{2(2\\sqrt{2})}{3}) - (-4\\sqrt{2} + \\frac{2(2\\sqrt{2})}{3})$
$= 8\\sqrt{2} - \\frac{8\\sqrt{2}}{3} = \\frac{24\\sqrt{2} - 8\\sqrt{2}}{3} = \\frac{16\\sqrt{2}}{3}$.`
  },
  {
    grade: 'Year 12',
    year: 2023,
    subject: 'Mathematics Advanced',
    topic: 'Trigonometry',
    marks: 3,
    question_text: `If $\\tan(\\theta) = \\frac{3}{4}$ and $\\theta$ is in the second quadrant, find the exact value of $\\sin(\\theta)$.`,
    marking_criteria: `Correct use of Pythagorean identity: 1 mark
Correct consideration of quadrant: 1 mark
Final answer: 1 mark`,
    sample_answer: `Since $\\tan(\\theta) = \\frac{3}{4}$ and $\\theta$ is in quadrant II, we have a right triangle with opposite = 3, adjacent = 4.
Hypotenuse = $\\sqrt{3^2 + 4^2} = 5$.
In quadrant II, $\\sin(\\theta) > 0$, so $\\sin(\\theta) = \\frac{3}{5}$.`
  },
  {
    grade: 'Year 12',
    year: 2023,
    subject: 'Mathematics Extension 1',
    topic: 'Mathematical Induction',
    marks: 4,
    question_text: `Prove by mathematical induction that $1^2 + 2^2 + 3^2 + \\ldots + n^2 = \\frac{n(n+1)(2n+1)}{6}$ for all positive integers $n$.`,
    marking_criteria: `Base case: 1 mark
Inductive step setup: 1 mark
Algebraic simplification: 1.5 marks
Conclusion: 0.5 marks`,
    sample_answer: `Base case: For $n = 1$, LHS $= 1^2 = 1$ and RHS $= \\frac{1 \\cdot 2 \\cdot 3}{6} = 1$. ✓

Assume $1^2 + 2^2 + \\ldots + k^2 = \\frac{k(k+1)(2k+1)}{6}$.

For $n = k+1$: $1^2 + 2^2 + \\ldots + k^2 + (k+1)^2 = \\frac{k(k+1)(2k+1)}{6} + (k+1)^2$
$= \\frac{k(k+1)(2k+1) + 6(k+1)^2}{6} = \\frac{(k+1)[k(2k+1) + 6(k+1)]}{6}$
$= \\frac{(k+1)(2k^2 + 7k + 6)}{6} = \\frac{(k+1)(k+2)(2k+3)}{6} = \\frac{(k+1)(k+2)(2(k+1)+1)}{6}$. ✓`
  },
  {
    grade: 'Year 12',
    year: 2023,
    subject: 'Mathematics Advanced',
    topic: 'Logarithms and Exponentials',
    marks: 3,
    question_text: `Solve $2^{x} = 5$ for $x$, giving your answer to 2 decimal places.`,
    marking_criteria: `Correct method using logarithms: 1.5 marks
Correct calculation: 1 mark
Correct rounding: 0.5 marks`,
    sample_answer: `$2^x = 5 \\Rightarrow x \\log(2) = \\log(5) \\Rightarrow x = \\frac{\\log(5)}{\\log(2)} = \\frac{0.699}{0.301} \\approx 2.32$.`
  },
  {
    grade: 'Year 11',
    year: 2024,
    subject: 'Mathematics Advanced',
    topic: 'Surds and Radicals',
    marks: 2,
    question_text: `Simplify $\\frac{\\sqrt{18} + \\sqrt{8}}{\\sqrt{2}}$.`,
    marking_criteria: `Simplifying surds: 1 mark
Final simplification: 1 mark`,
    sample_answer: `$\\frac{\\sqrt{18} + \\sqrt{8}}{\\sqrt{2}} = \\frac{3\\sqrt{2} + 2\\sqrt{2}}{\\sqrt{2}} = \\frac{5\\sqrt{2}}{\\sqrt{2}} = 5$.`
  },
  {
    grade: 'Year 11',
    year: 2024,
    subject: 'Mathematics Advanced',
    topic: 'Quadratic Functions',
    marks: 3,
    question_text: `Find the vertex and axis of symmetry of the parabola $y = -2x^2 + 8x - 5$.`,
    marking_criteria: `Correct method for finding vertex: 1.5 marks
Correct vertex coordinates: 1 mark
Correct axis of symmetry: 0.5 marks`,
    sample_answer: `For $y = -2x^2 + 8x - 5$, the x-coordinate of vertex is $x = -\\frac{b}{2a} = -\\frac{8}{2(-2)} = 2$.
$y = -2(2)^2 + 8(2) - 5 = -8 + 16 - 5 = 3$.
Vertex: $(2, 3)$. Axis of symmetry: $x = 2$.`
  }
];

async function populateQuestions() {
  try {
    console.log('🚀 Populating HSC questions...\n');

    const { error } = await supabase
      .from('hsc_questions')
      .insert(SAMPLE_QUESTIONS);

    if (error) {
      console.error('❌ Error inserting questions:');
      console.error(error.message);
      process.exit(1);
    }

    console.log(`✅ Successfully inserted ${SAMPLE_QUESTIONS.length} questions`);
    console.log('\n📊 Sample questions added:');
    SAMPLE_QUESTIONS.forEach((q, idx) => {
      console.log(`${idx + 1}. ${q.subject} (${q.topic}) - ${q.marks} marks`);
    });
    console.log('\n✨ Database is ready! Run: npm run dev');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

populateQuestions();
