#include <iostream>

class DynamicArray {
    private:
        int* arr;
        int currentSize; // Shows number of elements currently in the array (Can be less than capacity)
        int capacity; // This can be used to track the allocated size of the array (Changable size unlike static arrays)

    public:
        DynamicArray() {
            arr = new int[1];
            currentSize = 0;
            capacity = 1;
        }

        DynamicArray(int initialCapacity) {
            arr = new int[initialCapacity];
            currentSize = 0;
            capacity = initialCapacity;
        }

        int& operator[](int index) {
            if(index < 0 || index >= currentSize) {
                std::cerr << "Index out of bounds!" << std::endl;
                exit(EXIT_FAILURE);
            }
            return arr[index];
        }

        DynamicArray(const DynamicArray& original) {
            arr = new int[original.capacity];
            currentSize = original.currentSize;
            capacity = original.capacity;
            for (int i = 0; i < currentSize; i++) {
                arr[i] = original.arr[i]; // arr[i] = original[i] would also work as we will overload the [] operator
            }
        }

        DynamicArray& operator=(const DynamicArray& original) {
            if(this == &original) {
                return *this; // Self-assignment check
            }

            delete[] arr; // To prevent memory leak, we need to free the existing array

            arr = new int[original.capacity];
            currentSize = original.currentSize;
            capacity = original.capacity;
            for (int i = 0; i < currentSize; i++) {
                arr[i] = original.arr[i]; // arr[i] = original[i] would also work as we will overload the [] operator
            }
            return *this;
        }

        // Move = Moving from an old to a newly created object
        // Move assignement = Moving from an old to an already existing object (which may have its own resources that need to be freed before moving the new resources)
        // Basically pointer changed. Old array was moved to a new pointer location and the original pointer is set to nullptr to prevent double deletion of the same memory when the destructor is called for both the original and the new object.
        // Array of size: 1000000000
        // Copy constructor: 1000000000 elements are copied, which is time-consuming and memory-consuming.
        // Move constructor: Just the pointer is moved, which is very fast and memory efficient.
        DynamicArray(DynamicArray&& original) {
            arr = original.arr;
            currentSize = original.currentSize;
            capacity = original.capacity;

            original.arr = nullptr;
            original.currentSize = 0;
            original.capacity = 0;
        }

        // Move assignment operator: Similar to move constructor, but we also need to free the existing array of the current object before moving the new array from the other object. We also need to check for self-assignment to prevent issues when an object is assigned to itself.
        DynamicArray& operator=(DynamicArray&& original) {
            if(this == &original) { // Both are pointers
                return *this;  // Self-assignment check. Current object and original object are the same = Return current object
            }
        
            delete[] arr;
        
            arr = original.arr;
            currentSize = original.currentSize;
            capacity = original.capacity;
        
            original.arr = nullptr;
            original.currentSize = 0;
            original.capacity = 0;
        
            return *this;
        }

        ~DynamicArray() {
            delete[] arr; // To prevent memory leak, we need to free the allocated array
        }

        void push_back(int value) {
            if(currentSize == capacity) {
                // // Need to resize the array
                // int* newArr = new int[capacity * 2]; // Create a new array with double the capacity (Standard approach to minimize future resizing)
                // for (int i = 0; i < currentSize; i++) {
                //     newArr[i] = arr[i]; // Copy old elements to the new array
                // }
                // delete[] arr; // To prevent memory leak, we need to free the old array
                // arr = newArr;
                // capacity *= 2;

                reserve(capacity * 2); // Reuse the reserve function to handle resizing logic [BOTTOM]
            }

            // Now we have enough capacity to add the new value
            arr[currentSize] = value; // Add the new value to the end of the array
            currentSize++;
        }

        void pop_back() {
            // if push_back increased the original capacity, we can just decrease the current size to "remove" the last element. No need to reduce the capacity.
            if(currentSize > 0) {
                currentSize--; // Just decrease the current size, we don't need to actually remove the element from the array
            } else {
                std::cerr << "Array is already empty!" << std::endl;
            }
        }

        void insert( int index, int value) {
            if(index < 0 || index > currentSize) {
                std::cerr << "Index out of bounds!" << std::endl;
                exit(EXIT_FAILURE);
            }

            if(currentSize == capacity) {
                // // Need to resize the array
                // int* newArr = new int[capacity * 2]; // Create a new array with double the capacity (Standard approach to minimize future resizing)
                // for (int i = 0; i < currentSize; i++) {
                //     newArr[i] = arr[i]; // Copy old elements to the new array
                // }
                // delete[] arr; // To prevent memory leak, we need to free the old array
                
                // arr = newArr;
                // capacity *= 2;
                
                reserve(capacity * 2); // Reuse the reserve function to handle resizing logic
            }

            currentSize++;
            for(int i = currentSize - 1; i > index; i--) {
                arr[i] = arr[i - 1];
            }
            arr[index] = value;
        }

        void remove(int index) {
            if(index < 0 || index >= currentSize) {
                std::cerr << "Index out of bounds!" << std::endl;
                exit(EXIT_FAILURE);
            }

            for(int i = index; i < currentSize - 1; i++) {
                arr[i] = arr[i + 1];
            }
            currentSize--;
        }

        int at(int index) {
            if(index < 0 || index >= currentSize) {
                std::cerr << "Index out of bounds!" << std::endl;
                exit(EXIT_FAILURE);
            }
            return arr[index];
        }

        int size() const {
            return currentSize;
        }

        int get_capacity() const {
            return capacity;
        }

        int front() {
            if(currentSize == 0) {
                std::cerr << "Array is empty!" << std::endl;
                exit(EXIT_FAILURE);
            }
            return arr[0];
        }

        int back() {
            if(currentSize == 0) {
                std::cerr << "Array is empty!" << std::endl;
                exit(EXIT_FAILURE);
            }
            return arr[currentSize - 1];
        }

        void clear() {
            currentSize = 0; // Just reset the current size to 0, we don't need to actually clear the elements from the array

             // Alternative: With memory deallocation and reallocation (not recommended for a static array, but shown here for demonstration):
            // delete[] arr; // Deallocate existing memory = arr pointing towwards a nullptr
            // arr = new int[capacity]; // Allocate new memory for the array. Capacity will remain the same as it was before clearance of the array.
        }

        int find(int value) {
            for(int i = 0; i < currentSize; i++) {
                if(arr[i] == value) {
                    return i; // Return the index of the found value
                }
            }
            return -1; // Return -1 if the value is not found
        }

        void swap(int index1, int index2) {
            if(index1 < 0 || index1 >= currentSize || index2 < 0 || index2 >= currentSize) {
                std::cerr << "Index out of bounds!" << std::endl;
                exit(EXIT_FAILURE);
            }

            int temp = arr[index1];
            arr[index1] = arr[index2];
            arr[index2] = temp;
        }

        void reverse() {
            for(int i = 0; i < currentSize / 2; i++) {
                // A swap operation to reverse the elements in place (Above swaop function can also be used here)
                int temp = arr[i];
                arr[i] = arr[currentSize - 1 - i];
                arr[currentSize - 1 - i] = temp;
            }
        }

        void print() const {
            for(int i = 0; i < currentSize; i++) {
                std::cout << arr[i] << " ";
            }
            std::cout << std::endl;
        }

        // Dynamic Array specifics
        void reserve( int newCapacity) {
            if(newCapacity > capacity) {
                int* newArr = new int[newCapacity]; // Create a new array with the specified capacity
                for (int i = 0; i < currentSize; i++) {
                    newArr[i] = arr[i]; // Copy old elements to the new array
                }
                delete[] arr; // To prevent memory leak, we need to free the old array
                arr = newArr;
                capacity = newCapacity;
            }
            else {
                std::cerr << "New capacity must be greater than current capacity!" << std::endl;
            }
        }
};