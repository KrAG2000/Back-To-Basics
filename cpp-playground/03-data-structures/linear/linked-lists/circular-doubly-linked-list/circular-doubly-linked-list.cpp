#include <iostream>

using namespace std;

class Node {
public:
    int data;
    Node* next;
    Node* prev;
};

class CircularDoublyLinkedList {
    private:
    Node* head;

    public:
    CircularDoublyLinkedList() {
        this->head = nullptr;
    }

    ~CircularDoublyLinkedList() {
        if (this->head == nullptr) {
            return;
        }

        Node* temp = this->head;
        do {
            Node* nodeToDelete = temp;
            temp = temp->next;
            delete nodeToDelete;
        } while (temp != this->head);
    }

    void insert(int data) {
        Node* newNode = new Node();
        newNode->data = data;

        if (this->head == nullptr) {
            newNode->next = newNode;
            newNode->prev = newNode;
            this->head = newNode;
        } else {
            Node* tail = this->head->prev; // In case of singly LL, we would have traversed to the tail and then inserted!

            tail->next = newNode;
            newNode->prev = tail;

            newNode->next = this->head;
            this->head->prev = newNode;

            this->head = newNode;
        }
    }

    void deleteNode(int data) {
        if (this->head == nullptr) {
            return;
        }

        Node* temp = this->head;
        do {
            if (temp->data == data) {
                temp->prev->next = temp->next;
                temp->next->prev = temp->prev;

                if (temp == this->head) {
                    this->head = temp->next; // Update head if the deleted node is the head. Always update head to next node!
                }

                delete temp;
                return;
            }
        } while (temp != this->head); // Yahan while loop lagay to temp = head walio condition always true = never entering while loop
    }

    // Real world use case:
    // 1 - Implement a round-robin scheduler where each process gets a fixed time slice, and the scheduler cycles through the processes in a circular manner.
    void roundRobinScheduling(int finish) {
        if (this->head == nullptr) {
            cout << "No processes to schedule." << endl;
            return;
        }

        Node* temp = this->head;
        do {
            cout << "Scheduling process with data: " << temp->data << endl;
            finish -= temp->data;
            // Simulate time slice for the process here
            temp = temp->next;
        } while (finish > 0);
        // } while (temp != this->head);
    }
};
