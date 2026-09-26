# JavaScript to TypeScript: 30-Day Curriculum

This is the source of truth for what each day requires. Every review checks a student's work against the day's PRACTICE, ALGORITHM DRILL, BUILD and DONE WHEN sections. A student may only be expected to use what that day's resources teach, plus earlier days.

## Contents

- Part 1: The outline
- Part 2: Core resources
- Part 3: The detailed curriculum (day by day)
- How to run each day

---

## PART 1: THE OUTLINE

### Week 1: Core JavaScript
- Day 1: Values, types, coercion, == vs ===, floating point
- Day 2: Control flow, truthiness, loops, break/continue/return
- Day 3: Functions, scope, closures, higher-order functions
- Day 4: Arrays and array methods, first look at Big O
- Day 5: Objects, references and copies, destructuring, spread, JSON
- Day 6: The DOM, events, forms, event delegation
- Day 7: Milestone: Task Manager with localStorage

### Week 2: Async, then TypeScript
- Day 8: Asynchronous JavaScript: promises, fetch, async/await
- Day 9: Modules, classes, errors, Map and Set
- Day 10: TypeScript setup: tsc, tsconfig, strict mode
- Day 11: Core types: inference, unions, literals, any vs unknown, aliases, tuples
- Day 12: Typed functions, narrowing, discriminated unions
- Day 13: Interfaces, classes in TypeScript, the DOM in TypeScript, enums
- Day 14: Milestone: Weather Dashboard (Vite and TypeScript), deployed

### Week 3: TypeScript in a real stack
- Day 15: Generics, binary search
- Day 16: keyof, typeof, utility types, as const
- Day 17: React fundamentals with TypeScript
- Day 18: React deeper: useEffect, fetching, custom hooks, useReducer
- Day 19: Node and Express with TypeScript: a REST API
- Day 20: Runtime validation with Zod, CORS, shared types
- Day 21: Milestone: Full-stack Job Application Tracker, deployed

### Week 4: Pro level
- Day 22: Mapped, conditional and template literal types
- Day 23: Type challenges
- Day 24: Testing with Vitest, typescript-eslint, stricter tsconfig
- Day 25: Algorithms and data structures in TypeScript
- Day 26: Result types, advanced async, declaration files
- Day 27: Reading real code, publishing an npm package
- Days 28 to 30: Capstone project

---

## PART 2: CORE RESOURCES

### Video series (all verified to exist)
- JS basics (Net Ninja, 6 videos, compiled by another uploader): https://www.youtube.com/playlist?list=PLqyUgadpThTIh8UiNG0F8f46QVSRL_K8L
- Async JS (Net Ninja, 2020, 11 videos): https://www.youtube.com/playlist?list=PLqyUgadpThTJ0vksXJ3n3cezXON6dbdow
- TypeScript (Net Ninja, 2020, 21 videos): https://www.youtube.com/playlist?list=PL4cUxeGkcC9gUgr39Q_yD6v-bSyMwKPUI
- React (Net Ninja, Full Modern React Tutorial, 2020): https://www.youtube.com/playlist?list=PL4cUxeGkcC9gZD-Tvwfod2gaISzfRiP9d
- Node and Express (Net Ninja, Node.js Crash Course, 2020, 12 videos): https://www.youtube.com/playlist?list=PL4cUxeGkcC9jsz4LDYc6kv3ymONOKxwBU

### Reading
- JavaScript: https://javascript.info (if a lesson link moves, search its title in the sidebar)
- TypeScript: https://www.typescriptlang.org/docs/handbook/intro.html
- TypeScript book (free): https://www.totaltypescript.com/books/total-typescript-essentials
- Big O: https://www.doabledanny.com/big-o-notation-in-javascript/ (read in sections across the month)

### Tools
- TypeScript Playground: https://www.typescriptlang.org/play
- Fake API for practice: https://jsonplaceholder.typicode.com

A note on age: most of these videos are from 2019 and 2020. The fundamentals are still correct. Where something has changed since, the day tells you what to use instead.

---

## PART 3: THE DETAILED CURRICULUM

Every day follows the same order: WATCH, READ, UNDERSTAND, PRACTICE, ALGORITHM DRILL (some days), BUILD, DONE WHEN. Do them in that order. Answer every DONE WHEN question before moving on. Commit at the end of each day.

---

### DAY 1: VALUES, TYPES, COERCION

**WATCH**
JS playlist: #1 Intro & Setup, #2 Syntax Basics & Types.

**READ**
- https://javascript.info/variables
- https://javascript.info/types
- https://javascript.info/type-conversions
- https://javascript.info/comparison

**UNDERSTAND**
Every value has a type. The `+` operator joins text if either side is a string, while `-`, `*` and `/` always do maths. Use `===` and never `==`. Decimals are approximate (`0.1 + 0.2`), so handle money in whole units like kobo.

**PRACTICE** (experiments.js)
The prediction list: coercion, comparisons, typeof, const, template literals, `0.1 + 0.2`, ending with a SURPRISES comment block.

**BUILD** (converter.js)
`nairaToUsd`, `usdToNaira`, `celsiusToFahrenheit`, `kgToPounds`. Each function returns its result, and all logging happens at the bottom. Check 0 gives 32 and 100 gives 212, then try the round trip.

**DONE WHEN**
- Why does `"5" + 3` give `"53"` but `"5" - 3` give `2`?
- What does `===` check that `==` does not?
- Why is `0.1 + 0.2` not exactly `0.3`?
- Why can you change a property on a const object?

---

### DAY 2: CONTROL FLOW AND LOOPS

**WATCH**
JS playlist: #3 Control Flow.

**READ**
- https://javascript.info/ifelse
- https://javascript.info/logical-operators
- https://javascript.info/nullish-coalescing-operator
- https://javascript.info/while-for
- https://javascript.info/alert-prompt-confirm

**UNDERSTAND**
The six falsy values. Condition order matters. Use `for` when you know the count, `while` when you do not. `break` leaves the loop, `continue` skips to the next lap, and `return` leaves the whole function. `prompt()` always returns a string.

**PRACTICE**
- drills.js (truthiness, `||` vs `??`)
- fizzbuzz.js (two versions)
- stats.js (findMax, findMin, findAverage with manual loops)

**BUILD** (guess.html and guess.js)
The guessing game, with a quit on Cancel, input validation before counting an attempt, and a win flag.

**DONE WHEN**
- Name the six falsy values.
- What is the difference between `||` and `??`?
- Why must the FizzBuzz combined check come first?
- What is the difference between break, continue and return?

---

### DAY 3: FUNCTIONS, SCOPE, CLOSURES

**WATCH**
JS playlist: #4 Functions.

**READ**
- https://javascript.info/function-basics
- https://javascript.info/function-expressions
- https://javascript.info/arrow-functions-basics
- https://javascript.info/closure

**UNDERSTAND**
Parameters are the inputs and return is the output. There are three ways to write a function. Scope looks outward, never inward. A closure is a function that keeps access to the variables where it was defined. A higher-order function takes a function as an argument.

**PRACTICE**
- scope.js (the outer and inner visibility test)
- closures.js (makeCounter, with the written explanation)
- arrows.js (three function forms, default parameters)

**BUILD** (calculator.js)
`add`, `subtract`, `multiply` and `divide` (with a divide-by-zero guard), plus `calculate(operation, a, b)`.

**DONE WHEN**
- Why does count survive after makeCounter has finished running?
- Why can code outside a function not see variables declared inside it?
- What is a higher-order function?

---

### DAY 4: ARRAYS AND ARRAY METHODS

**WATCH**
"All 33 JavaScript Array Methods In One Video" by Code Explained: https://www.youtube.com/watch?v=RVxuGCWZ_8E
Watch ONLY these parts (about 35 minutes):
- 0:58 to 3:45: arrow functions and forEach
- 3:45 to 8:51: map and filter
- 8:51 to 9:53: concat
- 9:53 to 13:03: find and findIndex
- 15:16 to 18:35: some, every, includes
- 18:35 to 20:33: push, unshift, pop, shift
- 26:31 to 31:34: slice and splice
- 31:34 to 35:05: sort and reverse
- 40:59 to 45:15: reduce

**READ**
- https://javascript.info/array
- https://javascript.info/array-methods
- https://www.doabledanny.com/big-o-notation-in-javascript/ (the introduction, O(1) and O(n) sections only)

**UNDERSTAND**
An array is an ordered list, and each item has an index starting at 0. Most array methods take a function as their argument. That function is called a callback, because the method calls it back on each element. This is the higher-order function idea from the day 3 calculator.

The five most used:
- `map` transforms every item, and returns a new array of the same length.
- `filter` keeps only the items that pass a test, and returns a new array that may be shorter.
- `reduce` boils the array down to one value. `[1, 2, 3].reduce((total, n) => total + n, 0)` gives 6. Read it as: start total at 0, and for each n, the new total is total + n.
- `find` returns the first item that matches, or undefined. `findIndex` returns its position, or -1.
- `sort` reorders the array. It changes the original, and by default it sorts as text, so `[10, 9, 1].sort()` gives `[1, 10, 9]`. For numbers, use `(a, b) => a - b`.

Three yes/no checks: `some` (does at least one item pass?), `every` (do all pass?), `includes` (is this exact value in the array?).

MUTATION RULE:
- These do NOT change the original: map, filter, reduce, find, findIndex, some, every, includes, slice, concat.
- These DO change the original: push, pop, shift, unshift, splice, sort, reverse.
- A function that quietly changes the array passed into it causes bugs that are hard to spot. `arr.slice()` makes a copy, so `arr.slice().sort(...)` sorts without touching the original. `arr.concat(item)` returns a new array with the item added.

Chaining: safe methods return new arrays, so they can be chained. `products.filter(p => p.price < 5000).map(p => p.name)` reads as "the names of the products under 5000". The usual shape is filter, then map, then optionally reduce.

BIG O, A FIRST LOOK: find, findIndex and includes secretly loop through the array. In the worst case they check every item. Double the array, double the work. This is written O(n), where n is the number of items. Big O describes how the work grows as the input grows, not how many seconds it takes. It plans for the worst case.

**PRACTICE** (arrays.js)
Type out an 8-item products array, each item like `{ name, price, category }` across 3 categories. Then write one expression for each:
1. Products under 5000
2. All the names
3. The total price of electronics
4. The first food item
5. The index of "Soap"
6. Is any product over 500000?
7. Are all products over 500?
8. A sorted copy, cheapest first, with the original unchanged (prove it)
9. The food names, sorted alphabetically

Also run the experiments: sort with and without a compare function, and the `nums.sort()` mutation test. Then rewrite the day 2 stats functions using reduce.

**ALGORITHM DRILL** (search.js)
`indexOfValue(arr, target)` with a manual loop. It is O(n).

**BUILD** (expenses.js)
Functions: `addExpense` (concat), `removeExpense` (filter), `totalSpent` (reduce), `byCategory` (filter), `biggestExpense` (reduce), `hasExpensiveItem` (some), `sortedByAmount` (slice and sort). None of them may change the input list. Log the original list at the end to prove it is unchanged.

**DONE WHEN**
- map vs filter?
- What is reduce's second argument for?
- find vs findIndex?
- Why does `[10, 9, 1].sort()` give a strange result, and how do you fix it?
- Which methods mutate?
- How do you sort without mutating?
- What is a callback?
- What does O(n) mean?

---

### DAY 5: OBJECTS, REFERENCES, DESTRUCTURING, SPREAD, JSON

**WATCH**
- JS playlist: #5 Objects.
- The video version of Web Dev Simplified's destructuring and spread lesson, linked at the top of the article below.

**READ**
- https://javascript.info/object
- https://javascript.info/object-copy
- https://blog.webdevsimplified.com/2020-08/destructuring-and-spread/
- https://javascript.info/keys-values-entries
- https://javascript.info/json

**UNDERSTAND**
An object groups values under names called keys. Arrays answer "which position?" and objects answer "which name?". `user.name` (dot notation) is for when you know the key while writing the code. `user[key]` (bracket notation) is for when the key is stored in a variable. Bracket notation is what lets objects work as lookup tables.

References (the key idea of the day): `const b = a` does NOT copy an object. `b` is a second name for the same object, so changing `b.name` also changes `a.name`. Arrays behave the same way. This is the real reason mutation bugs happen: the function received the caller's actual array, not a copy.

Spread is the modern way to copy:
- `{ ...obj }` copies an object.
- `[...arr]` copies an array.
- `[...arr, item]` is the new way to add an item (it replaces yesterday's concat).
- `{ ...task, done: true }` copies a task and overrides one field.
Spread makes a shallow copy. The top level is new, but nested objects inside are still shared.

Destructuring pulls values out in one line: `const { name, age } = user` and `const [first, second] = arr`. Rest collects whatever is left: `const { password, ...safeUser } = user`.

Object.keys, Object.values and Object.entries turn an object into arrays, so you can use your day 4 methods on it.

JSON is text that looks like an object. `JSON.stringify` turns an object into text, and `JSON.parse` turns text back into an object.

BIG O: THE HASH MAP IDEA. Looking up `obj[key]` takes the same time no matter how big the object gets. That is O(1). Counting things into an object instead of using nested loops is the most useful speed trick in programming.

**PRACTICE** (objects.js)
Build a nested user object with an address object and an orders array. Then:
- Destructure the city and the first order's total in one statement.
- Copy the user with spread, change the copy's name, and prove the original is unchanged.
- Change the copy's `address.city`, and see the original change too. Explain why (shallow copy).
- Use Object.keys, Object.values and Object.entries on the user.
- Stringify the user, check typeof on the result, then parse it back.

**ALGORITHM DRILL** (frequency.js)
- `countWords(sentence)` returns an object like `{ the: 3, cat: 1 }`. Use split(" ") and bracket notation.
- `isAnagram(a, b)` uses two character counts. For example, "listen" and "silent" are anagrams.

**BUILD** (contacts.js)
Functions: `addContact` (spread), `findByName` (case-insensitive, using toLowerCase and includes), `updateContact(list, id, changes)` (use map and `{ ...contact, ...changes }`), and `deleteContact` (filter). Everything must be immutable.
Also rebuild the day 4 expense tracker's missing piece: `summary(list)`, which returns `{ food: 12000, transport: 8000 }` using reduce with `{}` as the start value and bracket notation.

**DONE WHEN**
- Why does changing b change a after `const b = a`?
- What is a shallow copy?
- When do you need bracket notation?
- What do stringify and parse do?
- Why is an object lookup O(1)?

---

### DAY 6: THE DOM, EVENTS, FORMS

**WATCH**
- JS playlist: #6 The Document Object Model.
- Net Ninja "JavaScript DOM Tutorial #9 - Events": https://www.youtube.com/watch?v=ndz6iH6o1ms
- Then #10 Event Bubbling and #11 Interacting with Forms, the next videos in that series. This series is from 2017, so it sometimes uses var. Read it as let.

**READ**
- https://javascript.info/searching-elements-dom
- https://javascript.info/modifying-document
- https://javascript.info/introduction-browser-events
- https://javascript.info/event-delegation

**UNDERSTAND**
The DOM is the browser's live JavaScript version of the HTML. Change it, and the page updates.

The front-end cycle:
1. Select an element: `document.querySelector("#list")`
2. Listen: `form.addEventListener("submit", handler)`
3. Update your data (your arrays and objects)
4. Re-render the page from that data

The most important idea: your data is the single source of truth. Write one `render()` function that clears the list and rebuilds it from the data. Call it after every change. Never patch bits of the page by hand. This is exactly how React works, so learning it now makes day 17 easy.

Forms: wrap the input in a form and listen for "submit". Pressing Enter submits the form automatically. Call `event.preventDefault()` first, or the page reloads. Read what was typed with `input.value`, and clear it with `input.value = ""`.

`textContent` sets text safely. `innerHTML` turns whatever you give it into HTML, which is dangerous with user input. Default to textContent, or build elements with createElement.

Event delegation: events bubble up from the element that was clicked to its parents. So put ONE listener on the parent and check `event.target` to see which child was clicked. It works for items added later, and it uses fewer listeners.

`prompt()` retires today. Real input comes from forms on the page.

**PRACTICE** (dom.html and dom.js)
A form with an input, and an empty ul. Submitting the form adds an item to an array, then calls render(). Clicking an li removes that item, using ONE listener on the ul. The input clears after each add.

**BUILD: GUESSING GAME, VERSION 2**
The same logic as day 2, with no prompt and no console. Use a form with a number input, a message area, an attempts display and a Play Again button. Keep the same skeleton: state, validate, count, compare, win or lose.

**DONE WHEN**
- What is the DOM?
- Why call preventDefault on submit?
- Why is innerHTML risky with user input?
- What is event delegation, and why does it work?
- What does "render from data" mean?

---

### DAY 7: MILESTONE, TASK MANAGER

**WATCH**
Net Ninja "JavaScript DOM Tutorial #15 - Checkboxes & Change Events" (the same series as day 6).

**READ**
https://javascript.info/localstorage

**UNDERSTAND**
localStorage saves text in the browser, and it survives a refresh. It only stores strings, so save with `localStorage.setItem("tasks", JSON.stringify(tasks))` and load with `JSON.parse(localStorage.getItem("tasks"))`. If nothing has been saved yet, getItem returns null, so fall back to an empty array: `JSON.parse(...) ?? []`. That is day 2's `??` earning its place.

A checkbox's `checked` property is true or false, and it fires a "change" event when clicked. A select element's `value` works exactly like an input's value.

The architecture rule: one array of task objects is the source of truth. Every action (add, toggle, delete, filter) updates the data immutably with map, filter and spread, then saves, then calls render().

**BUILD** (index.html, style.css, app.js)
- Add a task with a title, a priority (a select: low, medium, high) and a due date (an input with type="date").
- Show the list. A checkbox toggles completion (strikethrough). A delete button removes the task, using delegation.
- Filters: all, active, completed, plus a priority filter.
- A live count of remaining tasks.
- Save to localStorage, so a refresh keeps everything.

No tutorials. Use MDN only for specific methods. Commit it with a README that explains the render cycle. This gets converted to TypeScript on day 13.

---

### DAY 8: ASYNCHRONOUS JAVASCRIPT

**WATCH**
Async playlist, #1 to #11 (short videos). #2 uses the older XMLHttpRequest. Watch it for the concepts, since fetch replaces it in #9.

**READ**
- https://javascript.info/promise-basics
- https://javascript.info/async-await
- https://javascript.info/promise-api (Promise.all section only)

**UNDERSTAND**
JavaScript does one thing at a time. Slow tasks like network requests would freeze the page, so JavaScript starts them, carries on, and handles the result when it arrives.

A Promise is an IOU for a future value. It is pending, then either fulfilled or rejected. `async` and `await` are the readable way to use promises. `await` pauses only that function, not the page, and it only works inside async functions.

The pattern to write constantly:
