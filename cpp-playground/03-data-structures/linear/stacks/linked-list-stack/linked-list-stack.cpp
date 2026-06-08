#include <iostream>

using namespace std;

class Node {
    public:
        int value;
        Node* next;

        Node(int val) {
            value = val;
            next = nullptr;
        }
};

class Stack {
    public:
        int size;
        Node* top; // Required for peeking in O(1) when implementing using a singly linked list. For DLL, track tail instead(Same concept)

        Stack() {
            size = 0;
            top = nullptr;
        }
    
        ~Stack() {
            // Clean up all nodes to prevent memory leaks
            while (top != nullptr) {
                Node* temp = top;
                top = top->next;
                delete temp;
            }
        }

        void push(int value) {
            Node* newNode = new Node(value);
            newNode->next = top;
            top = newNode;
            size++;
        }

        void pop() {
            if(size > 0) {
                Node* temp = top;
                top = top->next;
                delete temp;
                size--;
            } else {
                cout << "Stack is empty. Cannot pop." << endl;
            }
        }

        int peek() {
            if(size > 0) {
                return top->value;
            } else {
                cout << "Stack is empty. Nothing to peek at!" << endl;
                return -1; // Return -1 to indicate stack is empty. In a real implementation, consider throwing an exception or using std::optional<int>.
            }
        }
};