#!/usr/bin/env bash

set -e

ROOT="cpp-playground"

# ----------------------------
# Root
# ----------------------------

mkdir -p "$ROOT"

touch "$ROOT/README.md"

# ----------------------------
# Core Structure
# ----------------------------

mkdir -p \
"$ROOT/playground/experiments" \
"$ROOT/playground/benchmarks" \
"$ROOT/primitive-ds" \
"$ROOT/moderate-ds" \
"$ROOT/composite-ds" \
"$ROOT/algorithms" \
"$ROOT/concurrency" \
"$ROOT/systems" \
"$ROOT/system-design" \
"$ROOT/docs" \
"$ROOT/scripts" \
"$ROOT/tools" \
"$ROOT/core" \
"$ROOT/instrumentation" \
"$ROOT/api" \
"$ROOT/visualizer/frontend" \
"$ROOT/visualizer/backend" \
"$ROOT/visualizer/shared"

touch "$ROOT/playground/scratch.cpp"

# ----------------------------
# Primitive DS
# ----------------------------

mkdir -p \
"$ROOT/primitive-ds/arrays/static-array" \
"$ROOT/primitive-ds/arrays/dynamic-array" \
"$ROOT/primitive-ds/arrays/multidimensional-array" \
"$ROOT/primitive-ds/arrays/sparse-array" \
"$ROOT/primitive-ds/linked-list/singly-linked-list" \
"$ROOT/primitive-ds/linked-list/doubly-linked-list" \
"$ROOT/primitive-ds/linked-list/circular-linked-list" \
"$ROOT/primitive-ds/linked-list/circular-doubly-linked-list" \
"$ROOT/primitive-ds/linked-list/xor-linked-list" \
"$ROOT/primitive-ds/stack/array-stack" \
"$ROOT/primitive-ds/stack/linked-list-stack" \
"$ROOT/primitive-ds/stack/min-stack" \
"$ROOT/primitive-ds/stack/multi-stack" \
"$ROOT/primitive-ds/queue/linear-queue" \
"$ROOT/primitive-ds/queue/circular-queue" \
"$ROOT/primitive-ds/queue/deque" \
"$ROOT/primitive-ds/queue/input-restricted-deque" \
"$ROOT/primitive-ds/queue/output-restricted-deque" \
"$ROOT/primitive-ds/queue/priority-queue" \
"$ROOT/primitive-ds/hashing/hash-table" \
"$ROOT/primitive-ds/hashing/chaining" \
"$ROOT/primitive-ds/hashing/open-addressing" \
"$ROOT/primitive-ds/hashing/linear-probing" \
"$ROOT/primitive-ds/hashing/quadratic-probing" \
"$ROOT/primitive-ds/hashing/double-hashing" \
"$ROOT/primitive-ds/hashing/rehashing" \
"$ROOT/primitive-ds/heap/min-heap" \
"$ROOT/primitive-ds/heap/max-heap" \
"$ROOT/primitive-ds/heap/binary-heap" \
"$ROOT/primitive-ds/heap/d-ary-heap" \
"$ROOT/primitive-ds/heap/indexed-heap" \
"$ROOT/primitive-ds/tree/binary-tree" \
"$ROOT/primitive-ds/tree/binary-search-tree" \
"$ROOT/primitive-ds/tree/threaded-binary-tree" \
"$ROOT/primitive-ds/tree/complete-binary-tree" \
"$ROOT/primitive-ds/tree/full-binary-tree" \
"$ROOT/primitive-ds/tree/perfect-binary-tree" \
"$ROOT/primitive-ds/tree/skewed-tree" \
"$ROOT/primitive-ds/graph/adjacency-list" \
"$ROOT/primitive-ds/graph/adjacency-matrix" \
"$ROOT/primitive-ds/graph/directed-graph" \
"$ROOT/primitive-ds/graph/undirected-graph" \
"$ROOT/primitive-ds/graph/weighted-graph" \
"$ROOT/primitive-ds/graph/disjoint-set"

# ----------------------------
# Moderate DS
# ----------------------------

mkdir -p \
"$ROOT/moderate-ds/balanced-trees/avl-tree" \
"$ROOT/moderate-ds/balanced-trees/red-black-tree" \
"$ROOT/moderate-ds/balanced-trees/splay-tree" \
"$ROOT/moderate-ds/balanced-trees/treap" \
"$ROOT/moderate-ds/balanced-trees/b-tree" \
"$ROOT/moderate-ds/balanced-trees/b-plus-tree" \
"$ROOT/moderate-ds/trie/standard-trie" \
"$ROOT/moderate-ds/trie/compressed-trie" \
"$ROOT/moderate-ds/trie/ternary-search-tree" \
"$ROOT/moderate-ds/trie/suffix-trie" \
"$ROOT/moderate-ds/segment-structures/segment-tree" \
"$ROOT/moderate-ds/segment-structures/lazy-segment-tree" \
"$ROOT/moderate-ds/segment-structures/fenwick-tree" \
"$ROOT/moderate-ds/segment-structures/interval-tree" \
"$ROOT/moderate-ds/probabilistic/bloom-filter" \
"$ROOT/moderate-ds/probabilistic/counting-bloom-filter" \
"$ROOT/moderate-ds/probabilistic/cuckoo-filter" \
"$ROOT/moderate-ds/probabilistic/skip-list" \
"$ROOT/moderate-ds/spatial/kd-tree" \
"$ROOT/moderate-ds/spatial/quadtree" \
"$ROOT/moderate-ds/spatial/octree" \
"$ROOT/moderate-ds/string-structures/suffix-array" \
"$ROOT/moderate-ds/string-structures/suffix-tree" \
"$ROOT/moderate-ds/string-structures/rolling-hash" \
"$ROOT/moderate-ds/string-structures/aho-corasick"

# ----------------------------
# Composite DS
# ----------------------------

mkdir -p \
"$ROOT/composite-ds/lru-cache" \
"$ROOT/composite-ds/lfu-cache" \
"$ROOT/composite-ds/arc-cache" \
"$ROOT/composite-ds/consistent-hash-ring" \
"$ROOT/composite-ds/ring-buffer" \
"$ROOT/composite-ds/slab-allocator" \
"$ROOT/composite-ds/memory-pool" \
"$ROOT/composite-ds/buddy-allocator" \
"$ROOT/composite-ds/rope" \
"$ROOT/composite-ds/piece-table" \
"$ROOT/composite-ds/gap-buffer" \
"$ROOT/composite-ds/inverted-index" \
"$ROOT/composite-ds/distributed-hash-table" \
"$ROOT/composite-ds/radix-tree" \
"$ROOT/composite-ds/radix-heap" \
"$ROOT/composite-ds/fibonacci-heap" \
"$ROOT/composite-ds/pairing-heap" \
"$ROOT/composite-ds/monotonic-queue" \
"$ROOT/composite-ds/monotonic-stack" \
"$ROOT/composite-ds/order-statistics-tree" \
"$ROOT/composite-ds/sparse-table" \
"$ROOT/composite-ds/wavelet-tree" \
"$ROOT/composite-ds/union-find-optimizations" \
"$ROOT/composite-ds/concurrent-queue" \
"$ROOT/composite-ds/lock-free-stack" \
"$ROOT/composite-ds/lock-free-queue" \
"$ROOT/composite-ds/concurrent-hashmap"

# ----------------------------
# Algorithms
# ----------------------------

mkdir -p \
"$ROOT/algorithms/sorting" \
"$ROOT/algorithms/searching" \
"$ROOT/algorithms/graph-algorithms" \
"$ROOT/algorithms/dynamic-programming" \
"$ROOT/algorithms/greedy" \
"$ROOT/algorithms/recursion" \
"$ROOT/algorithms/backtracking" \
"$ROOT/algorithms/bit-manipulation" \
"$ROOT/algorithms/sliding-window" \
"$ROOT/algorithms/two-pointers" \
"$ROOT/algorithms/string-algorithms"

# ----------------------------
# Concurrency
# ----------------------------

mkdir -p \
"$ROOT/concurrency/thread-pool" \
"$ROOT/concurrency/blocking-queue" \
"$ROOT/concurrency/producer-consumer" \
"$ROOT/concurrency/read-write-lock" \
"$ROOT/concurrency/semaphore" \
"$ROOT/concurrency/spinlock" \
"$ROOT/concurrency/mutex" \
"$ROOT/concurrency/condition-variable" \
"$ROOT/concurrency/wait-free" \
"$ROOT/concurrency/lock-free"

# ----------------------------
# Systems
# ----------------------------

mkdir -p \
"$ROOT/systems/message-queue" \
"$ROOT/systems/pub-sub-system" \
"$ROOT/systems/load-balancer" \
"$ROOT/systems/rate-limiter" \
"$ROOT/systems/key-value-store" \
"$ROOT/systems/distributed-cache" \
"$ROOT/systems/url-shortener" \
"$ROOT/systems/scheduler" \
"$ROOT/systems/search-engine-core" \
"$ROOT/systems/logging-system" \
"$ROOT/systems/file-system" \
"$ROOT/systems/in-memory-db" \
"$ROOT/systems/job-queue" \
"$ROOT/systems/event-loop" \
"$ROOT/systems/rpc-framework" \
"$ROOT/systems/websocket-server" \
"$ROOT/systems/http-server" \
"$ROOT/systems/tcp-server" \
"$ROOT/systems/allocator" \
"$ROOT/systems/mini-redis" \
"$ROOT/systems/mini-kafka" \
"$ROOT/systems/mini-nginx" \
"$ROOT/systems/mini-docker"

# ----------------------------
# System Design
# ----------------------------

mkdir -p \
"$ROOT/system-design/url-shortener" \
"$ROOT/system-design/whatsapp" \
"$ROOT/system-design/youtube" \
"$ROOT/system-design/twitter" \
"$ROOT/system-design/uber" \
"$ROOT/system-design/instagram" \
"$ROOT/system-design/netflix" \
"$ROOT/system-design/dropbox" \
"$ROOT/system-design/google-drive" \
"$ROOT/system-design/notification-system" \
"$ROOT/system-design/chat-system" \
"$ROOT/system-design/distributed-cache" \
"$ROOT/system-design/distributed-queue" \
"$ROOT/system-design/search-engine"

echo "cpp-playground structure created successfully"
