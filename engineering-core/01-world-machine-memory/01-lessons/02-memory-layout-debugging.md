# Memory Layout and Debugging

This lesson connects source code to real process memory.

## What to Know

- stack frames and function calls
- heap allocation and fragmentation
- static storage and global data
- pointers, references, and aliasing
- cache lines, locality, and false assumptions about "constant time"

## Debugging Lens

When something breaks, ask:

1. Where does this value live?
2. Who owns it?
3. When does it die?
4. What nearby memory or state can it affect?

## Practice Prompt

Create one file in `02-drills/` where you compare:

- stack vs heap
- contiguous vs scattered memory
- logical bug vs memory bug
