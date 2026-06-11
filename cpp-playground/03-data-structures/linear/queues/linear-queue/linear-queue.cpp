#include <iostream>

class LinearQueue {
    int data;
    int front;
    int rear;
    int capacity;
    int* queue; 

    LinearQueue(int c) {
        data = 0;
        front = 0;
        rear = -1;
        capacity = c;
        queue = new int[capacity];
    }
    
    ~LinearQueue() {
        delete[] queue;
    }

    void push(int x) {
        if (rear == capacity - 1) {
            std::cout << "Queue is full" << std::endl;
            return;
        }
        rear++;
        queue[rear] = x;
    }

    void pop() {
        if (front > rear) {
            std::cout << "Queue is empty" << std::endl;
            return;
        }
        front++;
    }

    int peek() {
        if (front > rear) {
            std::cout << "Queue is empty" << std::endl;
            return -1; // Return -1 to indicate the queue is empty
        }
        return queue[front];
    }
};