#include <iostream>

class Node {
    public:
    Node* next;
    int data;

    public:
        Node() {
            data = 0;
            next = nullptr;
        }

        Node(int data) {
            this->data = data;
            next = nullptr;
        }
};

class SinglyLinkedList {
    public:
        Node* head;

    public:
        SinglyLinkedList() {
            head = nullptr;
        }

        SinglyLinkedList(int data) {
            head = new Node(data);
        }

        SinglyLinkedList(SinglyLinkedList* original) {
            if (original->head == nullptr) {
                head = nullptr;
                return;
            }

            head = new Node(original->head->data);
            Node* currentOriginal = original->head->next;
            Node* currentNew = head;

            while (currentOriginal != nullptr) {
                currentNew->next = new Node(currentOriginal->data);
                currentNew = currentNew->next;
                currentOriginal = currentOriginal->next;
            }
        }

        SinglyLinkedList(int* arr, int size) { // Array contains data to insert into each node of the linked list
            if (size <= 0) {
                head = nullptr;
                return;
            }

            head = new Node(arr[0]);
            Node* current = head;

            for (int i = 1; i < size; i++) {
                current->next = new Node(arr[i]);
                current = current->next;
            }
        }

        void insertAtHead(int data) {
            Node* newNode = new Node(data);
            // This order of setting matters! Brainstorm: Why?
            newNode->next = head;
            head = newNode;
        }

        void insertAtTail(int data) {
            Node* newNode = new Node(data);
            if (head == nullptr) {
                head = newNode;
                return;
            }

            Node* current = head;
            while (current->next != nullptr) {
                current = current->next;
            }
            current->next = newNode;
        }

        void insertAtPos(int data, int pos) {
            if (pos < 0) {
                std::cerr << "Position cannot be negative." << std::endl;
                return;
            }

            if (pos == 0) {
                insertAtHead(data);
                return;
            }

            Node* newNode = new Node(data);
            Node* current = head;
            int currentIndex = 0;

            while (current != nullptr && currentIndex < pos - 1) {
                current = current->next;
                currentIndex++;
            }

            if (current == nullptr) {
                std::cerr << "Position out of bounds. Cannot insert at the stated position." << std::endl;
                delete newNode; // Clean up the allocated node
                return;
            }

            // Order of setting matters! Brainstorm: Why?
            newNode->next = current->next;
            current->next = newNode;
        }

        void insert(int data, int pos = -1) {
            switch(pos) {
                case 0:
                    insertAtHead(data);
                    break;
                case -1:
                    insertAtTail(data);
                    break;
                default:
                    insertAtPos(data, pos);
            }
        }

        void deleteAtHead() {
            if (head == nullptr) {
                std::cerr << "List is empty. Cannot delete from head." << std::endl;
                return;
            }

            Node* temp = head;
            head = head->next;
            delete temp;
        }

        void deleteAtTail() {
            if (head == nullptr) {
                std::cerr << "List is empty. Cannot delete from tail." << std::endl;
                return;
            }

            if (head->next == nullptr) {
                delete head;
                head = nullptr;
                return;
            }

            Node* current = head;
            while (current->next->next != nullptr) {
                current = current->next;
            }

            delete current->next;
            current->next = nullptr;
        }

        void deleteAtPos(int pos) {
            if(pos < 0) {
                std::cerr << "Position cannot be negative." << std::endl;
                return;
            }

            if(pos == 0) {
                deleteAtHead();
                return;
            }

            Node* currentHead = head;
            int counter = 0;

            while(currentHead != nullptr && counter < pos - 1) {
                currentHead = currentHead->next;
                counter++;
            }

            if(currentHead == nullptr || currentHead->next == nullptr) {
                std::cerr << "Position out of bounds. Cannot delete at the stated position." << std::endl;
                return;
            }

            Node* nodeToDelete = currentHead->next;
            currentHead->next = currentHead->next->next;
            delete nodeToDelete;
        }

        void deelete(int pos = -1) {
            switch(pos) {
                case 0:
                    deleteAtHead();
                    break;
                case -1:
                    deleteAtTail();
                    break;
                default:
                    deleteAtPos(pos);
            }
        }

        int search(int key) {
            Node* currentHead = head;
            int counter = 0;
            
            while(currentHead != nullptr) {
                std::cout << currentHead->data << " - " << key << std::endl; 
                if(currentHead->data == key) return key;
                else currentHead = currentHead->next;
            }
            return -1; // Key not found
        }
};

int main() {
    SinglyLinkedList list;
    std::cout << "Inserting 10: " << std::endl;
    list.insert(10);
    std::cout << "Inserting 20: " << std::endl;
    list.insert(20);
    std::cout << "Inserting 30: " << std::endl;
    list.insert(30);
    std::cout << "Inserting 40: " << std::endl;
    list.insert(40, 0);
    std::cout << "Inserting 50: " << std::endl;
    list.insert(50, 2);

    std::cout << "Search for 30: " << list.search(30) << std::endl; // Should print 30
    std::cout << "Search for 60: " << list.search(60) << std::endl; // Should print -1 (not found)

    // list.deelete(0); // Delete head
    // list.deelete(-1); // Delete tail
    // list.deelete(1); // Delete at position 1

    return 0;
}