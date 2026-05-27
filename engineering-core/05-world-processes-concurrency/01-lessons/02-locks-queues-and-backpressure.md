# Locks, Queues, and Backpressure

Shared state is powerful and dangerous.

## What to Know

- mutexes and contention
- deadlocks and lock ordering
- producer-consumer queues
- bounded systems
- retries, overload, and backpressure

## Mental Model

Every system eventually asks:

`What should happen when work arrives faster than it can be finished?`
