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

    int getLength() {
        int length = 0;
        Node *current = head;
        while (current != nullptr) {
            length++;
            current = current->next;
        }
        return length;
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

    void insertAtPos(int data, int pos) {
        if(pos < 0) {
            cout << "Position cannot be negative." << endl;
            return;
        }
        if(pos == 0) {
            prepend(data);
            return;
        }
        if(pos >= getLength()) {
            append(data);
            return;
        }
        Node *newNode = new Node(data);
        Node *current = head;
        for(int i = 0; i < pos; i++) {
            current = current->next;
        }
        newNode->next = current;
        newNode->prev = current->prev;
        current->prev->next = newNode;
        current->prev = newNode;
    }

    void deleteAtPos(int pos) {
        if(pos < 0 || pos >= getLength()) {
            cout << "Position out of bounds." << endl;
            return;
        }
        Node *current = head;
        for(int i = 0; i < pos; i++) {
            current = current->next;
        }
        if(current->prev != nullptr) {
            current->prev->next = current->next;
        } else {
            head = current->next;
        }
        if(current->next != nullptr) {
            current->next->prev = current->prev;
        } else {
            tail = current->prev;
        }
        delete current;
    }

    int search(int data) {
        Node* current = head;
        int lengthOfList = getLength();
        for(int i = 0; i < lengthOfList; i++) {
            if(current->data == data) {
                return i;
            }
            current = current->next;
        }
        return -1; // Data not found
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