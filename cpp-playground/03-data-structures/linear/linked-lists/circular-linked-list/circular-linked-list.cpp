#include <iostream>

using namespace std;

class Node
{
public:
    int data;
    Node *next;
    Node(int data)
    {
        this->data = data;
        this->next = nullptr;
    }
};

class CircularLinkedList
{
private:
    Node *head;

public:
    CircularLinkedList()
    {
        this->head = nullptr;
    }

    void insert(int data)
    {
        if (this->head == nullptr)
        {
            this->head = new Node(data);
            this->head->next = this->head; // Last node simply connects to the head node (That's the only difference between circular linked list and regular linked list)
        }
        else
        {
            Node *newNode = new Node(data);
            Node *temp = this->head;
            while (temp->next != this->head)
            {
                temp = temp->next;
            }
            temp->next = newNode;
            newNode->next = this->head;
        }
    }

    void deleteFirstFound(int data)
    {
        if (this->head == nullptr)
        {
            return;
        }

        Node *temp = this->head;
        Node *prev = nullptr;

        do
        {
            if (temp->data == data)
            {
                if (prev == nullptr)
                {
                    // Deleting the head node
                    Node *lastNode = this->head;
                    while (lastNode->next != this->head)
                    {
                        lastNode = lastNode->next;
                    }
                    lastNode->next = this->head->next;
                    this->head = this->head->next;
                }
                else
                {
                    prev->next = temp->next;
                }
                delete temp;
                return;
            }
            prev = temp;
            temp = temp->next;
        } while (temp != this->head);
    }

    void deleteAllFound(int data)
    {
        if (this->head == nullptr)
        {
            return;
        }

        Node *temp = this->head;
        Node *prev = nullptr;

        do
        {
            if (temp->data == data)
            {
                if (prev == nullptr)
                {
                    // Deleting the head node
                    Node *lastNode = this->head;
                    while (lastNode->next != this->head)
                    {
                        lastNode = lastNode->next;
                    }
                    lastNode->next = this->head->next;
                    this->head = this->head->next;
                }
                else
                {
                    prev->next = temp->next;
                }
                Node *nodeToDelete = temp;
                temp = temp->next; // Move to the next node before deleting the current node
                delete nodeToDelete;
            }
            else
            {
                prev = temp;
                temp = temp->next;
            }
        } while (temp != this->head);
    }

    int search(int data)
    {
        if (this->head == nullptr)
        {
            cout << "List is empty." << endl;
            return -1;
        }

        Node *temp = this->head;
        do
        {
            if (temp->data == data)
            {
                cout << "Data found: " << temp->data << endl;
                return temp->data;
            }
            temp = temp->next;
        } while (temp != this->head);
        cout << "Data not found." << endl;
        return -1;
    }

    // Implement a playlist where, given a starting song and a number n,
    // you can continuously play the next n songs while automatically looping back to the first song when the end is reached.
    Node *currSong = nullptr;
    void playNextSongs(int startSong, int n)
    {
        if (this->head == nullptr)
        {
            cout << "Playlist is empty." << endl;
            return;
        }

        Node *temp = this->head;
        // Find the starting song
        if (currSong != nullptr)
        {
            temp = currSong; // Start from the current song if it's already set
        }
        else
        {
            do
            {
                if (temp->data == startSong)
                {
                    break;
                }
                temp = temp->next;
            } while (temp != this->head);
            currSong = temp; // Set the current song to the starting song
        }

        // Play the next n songs
        for (int i = 0; i < n; i++)
        {
            cout << "Playing: " << temp->data << endl;
            temp = temp->next;
            currSong = temp;
        }
    }
};