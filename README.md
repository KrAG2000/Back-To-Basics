# C++ DSA, Systems & Design Playground

A personal playground repository to deeply understand Data Structures, Algorithms, Systems, Concurrency and System Design through implementation from scratch using C++.

The goal is not competitive programming problem count.

The goal is:
- implementation depth
- systems thinking
- memory understanding
- debugging skills
- architecture understanding
- interactive revision

---

# Core Philosophy

Everything in this repository should be:

- implemented from scratch first
- runnable independently
- interactive where possible
- modular
- easy to revise quickly
- expandable into larger systems

---

# Learning Progression

```txt
Primitive Data Structures
        ↓
Moderate Data Structures
        ↓
Composite Data Structures
        ↓
Algorithms
        ↓
Concurrency
        ↓
Systems
        ↓
System Design
```

---

# Repository Structure

```txt
cpp-playground/
│
├── README.md
│
├── playground/
│   ├── scratch.cpp
│   ├── experiments/
│   └── benchmarks/
│
├── primitive-ds/
│
├── moderate-ds/
│
├── composite-ds/
│
├── algorithms/
│
├── concurrency/
│
├── systems/
│
├── system-design/
│
├── docs/
│
├── scripts/
│
└── tools/
```

---

# Primitive Data Structures

Basic foundational structures.

```txt
primitive-ds/
│
├── arrays/
│   ├── static-array/
│   ├── dynamic-array/
│   ├── multidimensional-array/
│   └── sparse-array/
│
├── linked-list/
│   ├── singly-linked-list/
│   ├── doubly-linked-list/
│   ├── circular-linked-list/
│   ├── circular-doubly-linked-list/
│   └── xor-linked-list/
│
├── stack/
│   ├── array-stack/
│   ├── linked-list-stack/
│   ├── min-stack/
│   └── multi-stack/
│
├── queue/
│   ├── linear-queue/
│   ├── circular-queue/
│   ├── deque/
│   ├── input-restricted-deque/
│   ├── output-restricted-deque/
│   └── priority-queue/
│
├── hashing/
│   ├── hash-table/
│   ├── chaining/
│   ├── open-addressing/
│   ├── linear-probing/
│   ├── quadratic-probing/
│   ├── double-hashing/
│   └── rehashing/
│
├── heap/
│   ├── min-heap/
│   ├── max-heap/
│   ├── binary-heap/
│   ├── d-ary-heap/
│   └── indexed-heap/
│
├── tree/
│   ├── binary-tree/
│   ├── binary-search-tree/
│   ├── threaded-binary-tree/
│   ├── complete-binary-tree/
│   ├── full-binary-tree/
│   ├── perfect-binary-tree/
│   └── skewed-tree/
│
└── graph/
    ├── adjacency-list/
    ├── adjacency-matrix/
    ├── directed-graph/
    ├── undirected-graph/
    ├── weighted-graph/
    └── disjoint-set/
```

---

# Moderate Data Structures

Advanced structures built on top of primitives.

```txt
moderate-ds/
│
├── balanced-trees/
│   ├── avl-tree/
│   ├── red-black-tree/
│   ├── splay-tree/
│   ├── treap/
│   ├── b-tree/
│   └── b-plus-tree/
│
├── trie/
│   ├── standard-trie/
│   ├── compressed-trie/
│   ├── ternary-search-tree/
│   └── suffix-trie/
│
├── segment-structures/
│   ├── segment-tree/
│   ├── lazy-segment-tree/
│   ├── fenwick-tree/
│   └── interval-tree/
│
├── probabilistic/
│   ├── bloom-filter/
│   ├── counting-bloom-filter/
│   ├── cuckoo-filter/
│   └── skip-list/
│
├── spatial/
│   ├── kd-tree/
│   ├── quadtree/
│   └── octree/
│
└── string-structures/
    ├── suffix-array/
    ├── suffix-tree/
    ├── rolling-hash/
    └── aho-corasick/
```

---

# Composite Data Structures

Structures created using one or more lower-level structures.

```txt
composite-ds/
│
├── lru-cache/
├── lfu-cache/
├── arc-cache/
├── consistent-hash-ring/
├── ring-buffer/
├── slab-allocator/
├── memory-pool/
├── buddy-allocator/
├── rope/
├── piece-table/
├── gap-buffer/
├── inverted-index/
├── distributed-hash-table/
├── radix-tree/
├── radix-heap/
├── fibonacci-heap/
├── pairing-heap/
├── monotonic-queue/
├── monotonic-stack/
├── order-statistics-tree/
├── sparse-table/
├── wavelet-tree/
├── union-find-optimizations/
├── concurrent-queue/
├── lock-free-stack/
├── lock-free-queue/
└── concurrent-hashmap/
```

---

# Algorithms

```txt
algorithms/
│
├── sorting/
├── searching/
├── graph-algorithms/
├── dynamic-programming/
├── greedy/
├── recursion/
├── backtracking/
├── bit-manipulation/
├── sliding-window/
├── two-pointers/
└── string-algorithms/
```

---

# Concurrency

```txt
concurrency/
│
├── thread-pool/
├── blocking-queue/
├── producer-consumer/
├── read-write-lock/
├── semaphore/
├── spinlock/
├── mutex/
├── condition-variable/
├── wait-free/
└── lock-free/
```

---

# Systems

Projects built using previously implemented DS and algorithms.

```txt
systems/
│
├── message-queue/
├── pub-sub-system/
├── load-balancer/
├── rate-limiter/
├── key-value-store/
├── distributed-cache/
├── url-shortener/
├── scheduler/
├── search-engine-core/
├── logging-system/
├── file-system/
├── in-memory-db/
├── job-queue/
├── event-loop/
├── rpc-framework/
├── websocket-server/
├── http-server/
├── tcp-server/
├── allocator/
├── mini-redis/
├── mini-kafka/
├── mini-nginx/
└── mini-docker/
```

---

# System Design

Architecture and scaling-focused section.

```txt
system-design/
│
├── url-shortener/
├── whatsapp/
├── youtube/
├── twitter/
├── uber/
├── instagram/
├── netflix/
├── dropbox/
├── google-drive/
├── notification-system/
├── chat-system/
├── distributed-cache/
├── distributed-queue/
└── search-engine/
```

Each folder may contain:
- architecture diagrams
- tradeoffs
- bottlenecks
- APIs
- storage design
- scaling strategies
- prototypes

---

# Structure of Each Module

Every module should follow a consistent structure.

```txt
example-module/
│
├── README.md
├── CMakeLists.txt
├── main.cpp
│
├── include/
│
├── src/
│
├── tests/
│
├── demo/
│
└── notes/
```

---

# Demonstration Philosophy

Every folder should be runnable independently.

Example:

```bash
./run linked-list
./run avl-tree
./run lru-cache
./run message-queue
```

The goal:
- faster revision
- lower friction
- interactive learning
- visual understanding
- practical debugging

---

# Interactive Revision

Demos should be interactive where possible.

Example:

```txt
1. Insert
2. Delete
3. Search
4. Traverse
5. Print
6. Exit
```

This improves:
- recall
- intuition
- debugging ability
- consistency

---

# Build System

Use:
- CMake
- modular builds
- independent executables

Avoid:
- single-file-only compilation
- manual repetitive compilation

---

# Rules

- Implement from scratch first
- Avoid unnecessary abstraction initially
- Keep first implementation simple
- Refactor later
- Add demos early
- Prioritize understanding over optimization
- Benchmark later
- Document tradeoffs
- Maintain consistent folder structure

---

# Long-Term Goal

Turn this repository into:
- a systems playground
- a revision engine
- a debugging lab
- a low-level C++ learning platform
- a backend engineering portfolio
- a system design knowledge base
