#include <iostream>
#include <vector>

using namespace std;

class Stack{
    public:
        int size;
        vector<int> stackArray;

        Stack() {
            size = 0;
        }

        ~Stack() {
            // Not necessary
            vector<int>().swap(stackArray); // Clear the vector and free memory. 
            // Vector is all we had as implementation of this stack.
        }

        void push(int value) {
            stackArray.push_back(value);
            size++;
        }

        void pop() {
            if (size > 0) {
                stackArray.pop_back();
                size--;
            } else {
                cout << "Stack is empty. Cannot pop." << endl;
            }
        }

        bool isEmpty() {
            return size == 0;
        }

        int peek() {
            if (size > 0) {
                return stackArray[size - 1];
            } else {
                cout << "Stack is empty. Nothing to peek at!" << endl;
                return -1;
            }
        }


};