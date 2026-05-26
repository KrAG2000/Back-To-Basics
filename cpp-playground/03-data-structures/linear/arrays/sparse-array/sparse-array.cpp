#include <iostream>
#include <map>
#include <stdexcept>
#include <utility>

class SparseArray2D {
private:
    int totalRows;
    int totalCols;
    // Maps a coordinate pair (row, col) to its non-zero value
    std::map<std::pair<int, int>, int> data;

    // Internal helper to validate bounds
    void checkBounds(int row, int col) const {
        if (row < 0 || row >= totalRows || col < 0 || col >= totalCols) {
            throw std::out_of_range("Index out of array bounds!");
        }
    }

public:
    // Constructor
    SparseArray2D(int rows, int cols) : totalRows(rows), totalCols(cols) {}

    // 1: Insert or update a value
    void set(int row, int col, int value) {
        checkBounds(row, col);

        if (value == 0) {
            // Optimization: If value is 0, erase the coordinate to free memory
            data.erase({row, col});
        } else {
            data[{row, col}] = value;
        }
    }

    // 2: Retrieve a value
    int get(int row, int col) const {
        checkBounds(row, col);

        auto it = data.find({row, col});
        if (it != data.end()) {
            // 'it' is the pointer to the value stored at (row, col): it->first is the pair, it->second is the value.
            return it->second; 
        }
        return 0; // Return default value if not stored
    }

    // 3: Explicitly clear a value back to 0
    void remove(int row, int col) {
        checkBounds(row, col);
        data.erase({row, col});
    }

    // 4: Calculate efficiency metric
    double getSparsity() const {
        long long totalCells = static_cast<long long>(totalRows) * totalCols;
        if (totalCells == 0) return 0.0;
        
        long long usedCells = data.size(); // Non zero entries
        return static_cast<double>(totalCells - usedCells) / totalCells * 100.0;
    }

    // 5: Print the stored data
    void display() const {
        std::cout << "Compressed Storage (Size " << totalRows << "x" << totalCols << "):\n";
        if (data.empty()) {
            std::cout << "  [Array is completely empty]\n";
            return;
        }
        for (const auto& [coord, val] : data) {
            std::cout << "  Pos (" << coord.first << ", " << coord.second << ") -> " << val << "\n";
        }
    }
};