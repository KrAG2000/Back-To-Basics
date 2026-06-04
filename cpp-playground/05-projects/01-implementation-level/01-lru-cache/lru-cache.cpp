#include <iostream>
#include <unordered_map>
// #include <list>

class Node {
    public:
        int key;
        int value;
        Node* prev;
        Node* next;

        Node(int k, int v) : key(k), value(v), prev(nullptr), next(nullptr) {}
};

class DoublyLinkedList {
    private:
        Node* head;
        Node* tail;

    public:
        DoublyLinkedList() : head(nullptr), tail(nullptr) {}

        void addToFront(Node* node) {
            node->next = head;
            node->prev = nullptr;

            if (head != nullptr) {
                head->prev = node;
            }
            head = node;

            if (tail == nullptr) {
                tail = node;
            }
        }

        void removeNode(Node* node) {
            if (node->prev != nullptr) {
                node->prev->next = node->next;
            } else {
                head = node->next;
            }

            if (node->next != nullptr) {
                node->next->prev = node->prev;
            } else {
                tail = node->prev;
            }
        }

        Node* removeTail() {
            if (tail == nullptr) return nullptr;

            Node* temp = tail;
            removeNode(tail);
            return temp;
        }
};

class LRUCache {
    
};