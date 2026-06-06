#include <iostream>
#include <unordered_map>
#include <list>

using namespace std;
class LRUCache {
    private:
        list<pair<int, int>> cacheList; // List (Doubly linked list) to store key-value pairs
        unordered_map<int, list<pair<int, int>>::iterator> cacheMap; // Hash map to store key and its corresponding iterator in the list
    public:
        int capacity;

        LRUCache(int capacity) {
            this->capacity = capacity;
        }

        int getValue(int id) {
            if (cacheMap.find(id) == cacheMap.end()) {
                return -1; // Key not found
            } else {
                // Move the accessed node to the front of the list (most recently used)
                auto it = cacheMap[id];
                int value = it->second;
                cacheList.erase(it);
                cacheList.push_front({id, value});
                cacheMap[id] = cacheList.begin();
                return value;
            }
        }

        void putKeyValue(int id, int value) {
            if (cacheMap.find(id) != cacheMap.end()) {
                // Key already exists, update the value and move it to the front
                auto it = cacheMap[id];
                cacheList.erase(it);
            } else {
                // Key does not exist, check if we need to evict the least recently used item
                if (cacheList.size() == capacity) {
                    // Evict the least recently used item (the last item in the list)
                    auto last = cacheList.back();
                    cacheMap.erase(last.first); // Remove from map
                    cacheList.pop_back(); // Remove from list
                }
            }
            // Insert the new key-value pair at the front of the list
            cacheList.push_front({id, value});
            cacheMap[id] = cacheList.begin(); // Update the map with the new iterator
        }
};