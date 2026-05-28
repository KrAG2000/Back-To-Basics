#include <iostream>

using namespace std;

class Node {
    public: 
    int data;
    Node *prev, *next;

    Node(int data) {
        this->data = data;
        this->prev = nullptr;
        this->next = nullptr;
    }

    ~Node() {
        cout << "Node with data " << this->data << " is being deleted." << endl;
    }
};

class DoublyLinkedList {
    private:
    Node *head, *tail;

    public:
    DoublyLinkedList() {
        this->head = nullptr;
        this->tail = nullptr;
    }

    ~DoublyLinkedList() {
        Node *current = head;
        while (current != nullptr) {
            Node *nextNode = current->next;
            delete current;
            current = nextNode;
        }
    }

    void append(int data) {
        Node *newNode = new Node(data);
        if (head == nullptr) {
            head = tail = newNode;
        } else {
            tail->next = newNode;
            newNode->prev = tail;
            tail = newNode;
        }
    }

    void prepend(int data) {
        Node *newNode = new Node(data);
        if (head == nullptr) {
            head = tail = newNode;
        } else {
            head->prev = newNode;
            newNode->next = head;
            head = newNode;
        }
    }

    void display() {
        Node *current = head;
        while (current != nullptr) {
            cout << current->data << " ";
            current = current->next;
        }
        cout << endl;
    }
};