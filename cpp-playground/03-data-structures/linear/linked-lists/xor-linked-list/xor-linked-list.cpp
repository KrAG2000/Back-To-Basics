#include <iostream>
#include <cstdint> // for uintptr_t

using namespace std;

class Node {
    public: 
    int data;
    Node *both; // XOR of previous and next node addresses

    Node(int data) {
        this->data = data;
        this->both = nullptr;
    }

    ~Node() {
        cout << "Node with data " << this->data << " is being deleted." << endl;
    }
};

class XORLinkedList {
    private:
    Node *head, *tail;

    public:
    XORLinkedList() {
        this->head = nullptr;
        this->tail = nullptr;
    }

    ~XORLinkedList() {
        Node *current = head;
        Node *prev = nullptr;
        while (current != nullptr) {
            Node *next = reinterpret_cast<Node*>(reinterpret_cast<uintptr_t>(prev) ^ reinterpret_cast<uintptr_t>(current->both));
            delete current;
            prev = current;
            current = next;
        }
    }

    void append(int data) {
        Node *newNode = new Node(data);
        if (head == nullptr) {
            head = tail = newNode;
        } else {
            tail->both = reinterpret_cast<Node*>(reinterpret_cast<uintptr_t>(tail->both) ^ reinterpret_cast<uintptr_t>(newNode));
            newNode->both = tail; // XOR with nullptr is just the address of tail
            tail = newNode;
        }
    }

    void printList() {
        Node *current = head;
        Node *prev = nullptr;
        while (current != nullptr) {
            cout << current->data << " ";
            Node *next = reinterpret_cast<Node*>(reinterpret_cast<uintptr_t>(prev) ^ reinterpret_cast<uintptr_t>(current->both));
            prev = current;
            current = next;
        }
        cout << endl;
    }
};