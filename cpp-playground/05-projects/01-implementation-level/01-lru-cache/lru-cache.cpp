#include <iostream>
#include <unordered_map>
#include <list>

using namespace std;


// Capacity: 6 (Max element that can be stored in the cache at a time)
// Head                                    Tail
//  |                                       |                       
//  V                                       V                       
// |1| <-> |2| <-> |3| <-> |4| <-> |5| <-> |6| <<< DLL stores the original values and the order of usage (Most recently used at the front and least recently used at the back)

// Hashmap
//  id1 -> pointer to value1 (Actual value is stored in the list, hashmap just stores the pointer to the value in the list for space efficiency and O(1) access time)
//  id2 -> pointer to value2
//  id3 -> pointer to value3
//  id4 -> pointer to value4
//  id5 -> pointer to value5
//  id6 -> pointer to value6

// That is all the data structures we need to implement the LRU Cache. 
// Time complexity of get is O(1) -> using hashmap, value can be accessed in O(1) time.
// Time complexity of put is O(1) -> using hashmap and list, we can insert, delete or reorder/update values in O(1) time.

class LRUCache {
    private:
        list<pair<int, int>> cacheList; // List (Doubly linked list) to store key(hash key) and value (actual value) pairs, and maintain the order of usage!
        unordered_map<int, list<pair<int, int>>::iterator> cacheMap; // Hash map to store key and its corresponding iterator(pointer to original node) in the list
    public:
        int capacity; // Fixes capacity of the cache

        LRUCache(int capacity) {
            this->capacity = capacity;
        }

        ~LRUCache() {
            // Destructor to clean up resources if needed (NOT NECESSARY in this case since we are using STL containers)
            // Otherwise, remove all elements from the list and map when the object goes out of scope when not using STL containers.
        }

        int getValue(int id) {
            // This doesnot create a new entry in the map, it just checks if the key exists or not (Not same as cacheMap[id])
            if (cacheMap.find(id) == cacheMap.end()) { 
                return -1;
            } else {
                // Move the accessed node to the front of the list (It becomes most recently used)
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