# 1. Static Array

### Definition

A fixed-size contiguous memory structure where elements are stored sequentially for maximum access speed and cache efficiency.

### Competitive Programming Use Cases

* **Prefix Sum Problems**
  Store cumulative values in fixed memory for constant-time range queries.

* **Frequency Counting**
  Count occurrences of bounded values like digits, characters, or IDs efficiently.

* **Sliding Window Algorithms**
  Maintain fixed-size ranges for subarray optimization problems.

* **Dynamic Programming Tables**
  Store deterministic states when dimensions are known beforehand.

* **Prime Sieve Algorithms**
  Mark boolean states for large fixed ranges efficiently.

### Real-World Use Cases

* **Embedded Systems**
  Devices with strict memory limits use fixed arrays to avoid runtime allocation.

* **Network Packet Buffers**
  Preallocated memory avoids unpredictable latency during packet processing.

* **Game Engine Object Pools**
  Reuse fixed memory blocks for bullets, particles, or NPCs.

* **Sensor Data Storage**
  Fixed-size telemetry arrays store recent readings predictably.

### Simple Project

* Fixed-size leaderboard system
* Circular sensor buffer
* Tic-tac-toe engine

---

# 2. Dynamic Array

### Definition

A resizable contiguous array that grows dynamically to support variable amounts of data while preserving fast indexing.

### Competitive Programming Use Cases

* **Variable-Length Input Storage**
  Store unknown-sized inputs without predefining limits.

* **Graph Adjacency Lists**
  Dynamically maintain neighbors for each node.

* **Stack and Queue Problems**
  Push/pop elements efficiently during algorithm execution.

* **Dynamic DP State Storage**
  Allocate states based on runtime constraints.

### Real-World Use Cases

* **Social Media Feeds**
  Posts grow dynamically as new content is loaded.

* **Shopping Cart Systems**
  Items increase or decrease during user interaction.

* **Backend API Responses**
  APIs return variable-sized datasets.

* **In-Memory Application Collections**
  Most application-level lists internally use dynamic arrays.

### Simple Project

* Todo application backend
* Playlist manager
* Browser history tracker

---

# 3. Sparse Array

### Definition

A memory-optimized structure that stores only non-default values to efficiently handle mostly-empty datasets.

### Competitive Programming Use Cases

* **Coordinate Compression**
  Map sparse large ranges into compact storage.

* **Sparse Graph Representation**
  Store only existing edges instead of full matrices.

* **Large Range State Tracking**
  Track few active values across huge ranges efficiently.

* **Sparse Memoization**
  Cache only visited DP states instead of full tables.

### Real-World Use Cases

* **Search Engine Indexing**
  Store only meaningful word-document mappings.

* **Machine Learning Sparse Matrices**
  Most features are zero, so only active values are stored.

* **GIS Systems**
  Huge coordinate maps store only populated regions.

* **Recommendation Systems**
  User-item matrices are mostly empty interactions.

### Simple Project

* Sparse matrix calculator
* Mini search index
* Infinite-grid drawing board

---

# 4. Multidimensional Array

### Definition

An array indexed using multiple dimensions to naturally model grids, matrices, tables, and spatial structures.

### Competitive Programming Use Cases

* **Grid Traversal Problems**
  Solve maze, island, and pathfinding questions using row-column indexing.

* **Matrix Operations**
  Perform rotation, multiplication, and transformation algorithms.

* **2D Dynamic Programming**
  Store states based on multiple variables.

* **Board Simulation Problems**
  Simulate chessboards, games, and cellular automata.

### Real-World Use Cases

* **Image Processing**
  Pixels are stored as 2D or 3D arrays.

* **Machine Learning Tensors**
  Neural networks process multidimensional tensor data.

* **Spreadsheet Systems**
  Cells naturally map to rows and columns.

* **Physics Simulations**
  Spatial environments are modeled using grids.

### Simple Project

* Sudoku solver
* Maze pathfinder
* Pixel image editor

---

# 5. Static Multidimensional Array

### Definition

A fixed-size multidimensional contiguous structure optimized for predictable high-performance grid computations.

### Competitive Programming Use Cases

* **Fixed Grid DP Problems**
  Preallocate deterministic DP tables for fast access.

* **Chessboard Simulations**
  Represent constant-sized boards efficiently.

* **Matrix Exponentiation**
  Perform repeated matrix operations using fixed dimensions.

### Real-World Use Cases

* **Scientific Simulations**
  Numerical computations require contiguous matrix memory.

* **GPU Processing**
  GPUs prefer fixed contiguous tensor layouts.

* **Embedded Graphics Systems**
  Frame buffers often use static 2D arrays.

### Simple Project

* Conway’s Game of Life
* Matrix multiplication engine
* Chessboard simulator

---

# 6. Dynamic Multidimensional Array

### Definition

A resizable multidimensional structure allowing flexible grid dimensions determined during runtime.

### Competitive Programming Use Cases

* **Runtime Grid Problems**
  Allocate grids dynamically based on input size.

* **Variable Matrix Problems**
  Handle unknown matrix dimensions efficiently.

* **Dynamic Simulation Systems**
  Expand grids as simulation states evolve.

### Real-World Use Cases

* **Spreadsheet Applications**
  Rows and columns grow dynamically.

* **Image Editing Software**
  Canvas dimensions can change during editing.

* **Simulation Engines**
  Dynamic worlds resize during runtime.

### Simple Project

* Spreadsheet clone
* Paint application
* Dynamic seat reservation system

---

# 7. Sparse Multidimensional Array

### Definition

A multidimensional structure storing only meaningful coordinates to efficiently represent massive sparse spaces.

### Competitive Programming Use Cases

* **Infinite Grid Problems**
  Store only visited coordinates instead of full grids.

* **Sparse BFS/DFS Traversal**
  Efficiently process active cells in huge spaces.

* **Large Coordinate Simulations**
  Avoid impossible memory allocations for huge dimensions.

### Real-World Use Cases

* **GIS and Mapping Systems**
  Store only populated geographic regions.

* **Sparse ML Tensors**
  High-dimensional sparse features reduce memory usage.

* **Voxel Engines**
  Store only occupied 3D blocks.

* **Large Graph Systems**
  Massive adjacency spaces are stored sparsely.

### Simple Project

* Infinite whiteboard
* Sparse voxel world
* Geographic heatmap engine
