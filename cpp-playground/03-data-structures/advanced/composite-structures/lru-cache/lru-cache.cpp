// #include <iostream>
// #include <unordered_map>

// using namespace std;

// class Node{
//     public:
//     int key, value;
//     Node* next;
//     Node* prev;
// };

// class LRUCache {
//     private:
//         int capacity;
//         unordered_map<int, Node*> cache; // key to node pointer mapping
//         Node* head;
//         Node* tail;

//     public:
//         LRUCache(int capacity) {
//             this->capacity = capacity;
//             head = new Node();
//             tail = new Node();
//             head->next = tail;
//             tail->prev = head;
//         }

//         int get(int key) {
//             if(cache.find(key) == cache.end()) {
//                 return -1; // Key not found
//             }

//             Node* temp = cache[key];

//             // Positioning
//             temp->prev->next = temp->next;
//             temp->next->prev = temp->prev;
//             temp->next = head->next;
//             temp->prev = head;
//             head->next->prev = temp;
//             head->next = temp;

//             return temp->value;
//         }

//         void put(int key, int value) {
//             if(cache.find(key) != cache.end()) {
//                 Node* temp = cache[key];
//                 temp->value = value;

//                 // Positioning
//                 temp->prev->next = temp->next;
//                 temp->next->prev = temp->prev;
//                 temp->next = head->next;
//                 temp->prev = head;
//                 head->next->prev = temp;
//                 head->next = temp;
//             } else {
//                 if(cache.size() == capacity) {
//                     Node* lru = tail->prev;
//                     cache.erase(lru->key);
//                     lru->prev->next = tail;
//                     tail->prev = lru->prev;
//                     delete lru; // Free memory
//                 }

//                 Node* newNode = new Node();
//                 newNode->key = key;
//                 newNode->value = value;

//                 // Positioning
//                 newNode->next = head->next;
//                 newNode->prev = head;
//                 head->next->prev = newNode;
//                 head->next = newNode;

//                 cache[key] = newNode;
//             }
//         }
// };

#include <iostream>
#include <unordered_map>
#include <list>

using namespace std;

class LRUCache
{

private:
    int capacity;
    unordered_map<int, pair<int, list<int>::iterator>> cache; // << Key value store to save key against the Node pointer
    list<int> lru;                                            // << Actual DLL

public:
    int get(int key)
    {
        /**
         * Check if the key exist
         * Fetch the key
         * Update the position of the key in the DLL
         */

        if (cache.find(key) == cache.end())
        {
            return -1; // Key not found
        }

        pair<int, list<int>::iterator> value = cache[key];
        lru.erase(value.second);
        lru.push_front(key);
        cache[key].second = lru.begin();
        return value.first;
    }

    void put(int key, int value)
    {
        /**
         * Check if the key exist
         * Yes = Update its pos and return
         * No = Create a new node + update the HM
         */

        if (cache.find(key) != cache.end())
        {
            // key found
            lru.erase(cache[key].second);
            lru.push_front(key);
            cache[key] = {value, lru.begin()};
        }
        else
        {
            // key not found
            if (cache.size() == capacity)
            {
                int lruKey = lru.back();
                lru.pop_back();
                cache.erase(lruKey);
            }
            lru.push_front(key);
            cache[key] = {value, lru.begin()};
        }
    }
};