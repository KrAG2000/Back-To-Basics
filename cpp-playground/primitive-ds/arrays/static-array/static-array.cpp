/**
    What this file features?
    1: Static Array implementation in C++ with dynamic memory allocation to allow for different capacities.
    2: Constructors for default initialization, custom capacity, and initialization with an array of values.
    3: Copy constructor and assignment operator for deep copying the array to prevent issues like double deletion, mixup of 2 arrays.
    4: Destructor to clean up memory and prevent memory leaks.
 */

#include <iostream>

using namespace std;

class StaticArray {
    private:
        int capacity; // Fixed size of the array
        int length; // Current number of elements in the array (<= capacity)
        int* arr; // Pointer to the array in heap memory
        
        // Note: The below line is just for demonstration. In practice, you would typically use dynamic memory allocation for a static array class to allow for different capacities. What is the difference between static and dynamic array? A static array has a fixed size determined at compile time, while a dynamic array can resize itself during runtime. In this implementation, we will use dynamic memory allocation to allow for different capacities.
        // int arr[10]; // Static array with fixed size of 10
        
    public:
        // Constructor to initialise a static array
        StaticArray() {
            this->capacity = 10; // Default capacity
            arr = new int[capacity]; // Allocate memory for the array
            length = 0; // Initialize length to 0
        }

        StaticArray(int capacity) {
            if(capacity <= 0) {
                cout << "[ ERROR ] :: Capacity should be greater than 0." << endl;
                return;
            }

            this->capacity = capacity;
            arr = new int[capacity];
            length = 0;
        }

        StaticArray(int capacity, int initialValues[], int lengthofInitialValues) {
            if(capacity <= 0) {
                cout << "[ ERROR ] :: Capacity should be greater than 0." << endl;
                return;
            }
            if(initialValues == nullptr) {
                cout << "[ ERROR ] :: Initial values array cannot be null." << endl;
                return;
            }
            if(lengthofInitialValues > capacity) {
                cout << "[ ERROR ] :: Initial values exceed the specified capacity." << endl;
                return;
            }
            
            this->capacity = capacity;
            arr = new int[capacity];
            length = 0;
            for(int i = 0; i < lengthofInitialValues; i++) {
                arr[i] = initialValues[i];
                length++;   
            }
        }

        // One liner: If we do not define the copy constructor and assignment operator, the compiler will generate default versions that perform shallow copying, which can lead to issues like double deletion when both objects are destroyed. By defining our own copy constructor and assignment operator, we ensure that each object manages its own memory correctly, preventing such issues.
        // | Operation        | Meaning                                |
        // | ---------------- | -------------------------------------- |
        // | Copy Constructor | Create new object from existing object |
        // | Copy Assignment  | Replace existing object's contents     |


        
        // Copy constructor for deep copying the array: Pointer of both arrays will be different. Changes in one array will not affect the other array.
        StaticArray(const StaticArray& original) {
            capacity = original.capacity;
            length = original.length;

            arr = new int[capacity];

            for(int i = 0; i < length; i++) {
                arr[i] = original.arr[i];
            }
        }

        // To handle assignment operator for deep copying the array: Pointer of both arrays will be different. Changes in one array will not affect the other array.
        // E.g. StaticArray arr1(5); // arr1 has capacity of 5 and length of 0
        //      StaticArray arr2(5); // arr2 has capacity of 5 and length of 0
        //      arr1 = arr2; // arr1 and arr2 will have the same capacity and length, but they will point to different memory locations.
        
        StaticArray& operator=(const StaticArray& original) {
            if(this == &original) {
                return *this;
            }
        
            delete[] arr;
        
            capacity = original.capacity;
            length = original.length;
        
            arr = new int[capacity];
        
            for(int i = 0; i < length; i++) {
                arr[i] = original.arr[i];
            }
        
            return *this;
        }

        // Destructor to clean up memory (Important to prevent memory leaks)
        ~StaticArray() {
            delete[] arr; // Deallocate memory when the object is destroyed. The pointer arr was allocated using new[], so we use delete[] to free that memory. This is crucial to prevent memory leaks, which can occur if we allocate memory and forget to free it when it's no longer needed. Also, the pointer still exists after the destructor is called, but it points to deallocated memory, so it's important not to access it after the destructor has run.
        }

        // Method:
        // 1: Add an element to the end of the array aka push_back && removing an element from the end of the array aka pop_back.
        void push_back(int value) {
            if(length < capacity) {
                arr[length] = value; // here, length is the position to insert the new value
                length++;
            }
            else {
                cout << "[ WARN  ] :: Array is at capacity." << endl;
            }
        }
        
        void pop_back() {
            if(length > 0) {
                length--;
            }
            else {
                cout << "[ WARN  ] :: Cannot remove an element from an empty array" << endl;
            }
        }

        // 2: Get the element at a specific index
        int at(int index) {
            if(index >= 0 && index < length) {
                return arr[index];
            }
            else {
                cout << "[ ERROR ] :: Requested index doesnot exists." << endl;
                return -1; // Errornous response for now. Throw error in real scenarios.
            }
        }

        // 3: Get the current size of the array
        int size() {
            return length;
        }

        // 4: Get the maximum capacity of the array
        int get_capacity() {
            return capacity;
        }

        // 5: Insert an element at a specific index
        void insert(int index, int value) {
            if(index < 0 || index > length) {
                cout << "[ ERROR ] :: Invalid index for insertion." << endl;
                return;
            }
            if(length >= capacity) {
                cout << "[ WARN  ] :: Array is at capacity. Cannot insert new element." << endl;
                return;
            }
            // Shift elements to the right to make space for the new element Average TC: O(n)
            for(int i = length; i > index; i --) {
                arr[i] = arr[i-1];
            } 
            arr[index] = value; // Insert the new value at the specified index
            length++; // Length increased by 1
        }

        // 6: Remove an element at a specific index
        void remove(int index) {
            if(index < 0 || index >= length) {
                cout << "[ ERROR ] :: Invalid index for removal." << endl;
                return;
            }
            for(int i = index; i < length - 1; i++) {
                arr[i] = arr[i+1]; // Shift elements to the left to fill the gap left by the removed element Average TC: O(n)
            }
            length--; // Length reduced by 1
        }

        // 7: Clear all elements from the array
        void clear() {
            length = 0; // New elements will simply replace the older ones. 

            // Alternative: With memory deallocation and reallocation (not recommended for a static array, but shown here for demonstration):
            // delete[] arr; // Deallocate existing memory = arr pointing towwards a nullptr
            // arr = new int[capacity]; // Allocate new memory for the array. Capacity will remain the same as it was before clearance of the array.
        }

        // 8: Front of the array
        int front() {
            if(length > 0) {
                return arr[0];
            }
            else {
                cout << "[ ERROR ] :: Array is empty." << endl;
                return -1; // Errornous response for now. Throw error in real scenarios.
            }
        }

        // 9: Back of the array
        int back() {
            if(length > 0) {
                return arr[length - 1];
            }
            else {
                cout << "[ ERROR ] :: Array is empty." << endl;
                return -1; // Errornous response for now. Throw error in real scenarios.
            }
        }

        // 10: Check if the array is empty
        bool isEmpty() {
            if(length == 0) {
                return true;
            }
            else {
                return false;
            }
        }

        // 11: Find the index of an element in the array
        int find(int element) {
            if(length == 0) {
                cout << "[ WARN  ] :: Array is empty." << endl;
                return -1; // Errornous response for now. Throw error in real scenarios.
            }

            for(int i = 0; i < length; i++) {
                if(arr[i] == element) {
                    return i; // Return the index of the found element
                }
            }

            cout << "[ WARN  ] :: Element not found in the array." << endl;
            return -1; // Errornous response for now. Throw error in real scenarios.
        }

        // 12: Swap two elements in the array
        void swap (int index1, int index2) {
            if(index1 < 0 || index1 >= length || index2 < 0 || index2 >= length) {
                cout << "[ ERROR ] :: Invalid indices for swapping." << endl;
                return;
            }

            int temp = arr[index1];
            arr[index1] = arr[index2];
            arr[index2] = temp;
        }

        // 13: Reverse the elements of the array
        void reverse () {
            for(int i = 0; i < length / 2; i++) {
                // Below part is basically swapping, 1st to last, 2nd to 2nd last and so on until the middle of the array is reached. Average TC: O(n)
                int temp = arr[i];
                arr[i] = arr[length - 1 - i];
                arr[length - 1 - i] = temp;
                
                // swap function in point 12 can be used here as well.
                // swap(i, length - 1 - i);
            }
        }
        
        // 14: Print the elements of the array
        void print() {
            for(int i = 0; i < length; i++) {
                cout << arr[i] << " ";
            }
            cout << endl;
        }

        // EXTRA: Overloading the [] operator to access elements of the array using array indexing syntax (e.g., arr[0], arr[1], etc.)
        // C++ specific but is used in many other languages as well.
        int& operator[](int index) {
            return arr[index];
        }
};