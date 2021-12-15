import React, {
    useState,
    useEffect,
    useLayoutEffect,
    useCallback
  } from 'react';
  import { TouchableOpacity, Text, TextInput,StyleSheet, View, Button, FlatList,ScrollView} from 'react-native';
  import { GiftedChat } from 'react-native-gifted-chat';
  import {
    collection,
    addDoc,
    orderBy,
    query,
    onSnapshot,
    where,
    deleteDoc
  } from 'firebase/firestore';
  import { signOut } from 'firebase/auth';
  
  import { auth, database } from '../config/firebase';
  
  export default function Chat({ navigation }) {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState("");
    const [showChat, setShowChat] = useState(false);
    const [onlineStatuses, setOnlineStatuses] = useState([]);
  
    //signing out auth
    const onSignOut = () => {
      localStorage.removeItem("createdUsername")
      signOut(auth)
      .catch(error => console.log('Error logging out: ', error));

      //remove online presence
      const collectionRef = collection(database, 'online');
      const q = query(collectionRef, where('userId',"==", auth?.currentUser?.uid));
      const unsubscribe = onSnapshot(q, querySnapshot => {
         querySnapshot.docs.map(doc => {
           deleteDoc(doc.ref)
         })
     });

     return () => unsubscribe()
    };
  

     //get online statuses
     useEffect(() => {
      const collectionRef = collection(database, 'online');
      const q = query(collectionRef, orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, querySnapshot => {
        setOnlineStatuses(
          querySnapshot.docs.map(doc => ({
            username: doc.data().username
          }))
        );
      });
  
      return unsubscribe;
    }, []);

    useLayoutEffect(() => {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            style={{
              marginRight: 10
            }}
            onPress={onSignOut}
          >
            <Text>Logout</Text>
          </TouchableOpacity>
        )
      });
    }, [navigation]);
  

     useEffect(() => {
      if(localStorage.getItem("createdUsername") !== null && auth !== null){
        setShowChat(true)
      }  
     }, []);
  
     //get chats
    useLayoutEffect(() => {
      const collectionRef = collection(database, 'chats');
      const q = query(collectionRef, orderBy('createdAt', 'desc'));
     
      const unsubscribe = onSnapshot(q, querySnapshot => {
        setMessages(
          querySnapshot.docs.map(doc => ({
            _id: doc.data()._id,
            createdAt: doc.data().createdAt.toDate(),
            text: doc.data().text,
            user: doc.data().user
          }))
        );
      });

  
      return unsubscribe;
    });

    
  
    const onSend = useCallback((messages = []) => {
      setMessages(previousMessages =>
        GiftedChat.append(previousMessages, messages)
      );
      const { _id, createdAt, text, user } = messages[0];
      addDoc(collection(database, 'chats'), {
        _id,
        createdAt,
        text,
        user
      });
    }, []);


    const onHandleUsername = () => {
      if(username.trim().length >=4 && username.trim() !== "")
      {
        localStorage.setItem("createdUsername",username)
        //add to list of online users
        addDoc(collection(database, 'online'), {
          userId: auth?.currentUser?.uid,
          username: username??auth?.currentUser?.email.split("@")[0],
          createdAt: new Date().toISOString(),
        });

        setShowChat(true)
      }
    };
  
  
  return (
    
    !(showChat) ? 
     ( 
       <>
      <TextInput
          style={styles.input}
          placeholder='Enter a display name to join chat ...'
          autoCapitalize='none'
          keyboardType='username'
          textContentType='username'
          value={username}
          onChangeText={text => setUsername(text)} 
        />
      <Button onPress={onHandleUsername} color='#28a745' title='Start Chat' />
      </>
     )
            :
            <>
         
              <View style={{flex:1,flexDirection:"row"}}>
                    <View style={{width:"75%", border:"1px solid gray"}}>
                        <GiftedChat
                          messages={messages}
                          showAvatarForEveryMessage={true}
                          onSend={messages => onSend(messages)}
                          renderUsernameOnMessage={true}
                          placeholder='Type a message...'
                          isTyping={true}
                          alwaysShowSend ={true}
                          user={{
                            _id: auth?.currentUser?.email,
                            avatar: 'https://i.pravatar.cc/300',
                            name: username??auth?.currentUser?.email.split("@")[0]
                          }}
                        
                        />
                </View>
                <View   style={{width:"25%", backgroundColor: '#fff',}}>
                    <Text style={styles.title}>Online Members</Text>
                    <ScrollView>
                        <FlatList
                          data={onlineStatuses}
                          renderItem={({item}) => <Text style={styles.item}>{item.username}</Text>}
                       />
                       </ScrollView>
                </View >
            </View>
      </>
    );
  }

  const styles = StyleSheet.create({
    input: {
      backgroundColor: '#fff',
      marginBottom: 20,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#333',
      borderRadius: 8,
      padding: 12

    },
    container: {
      flex: 1,
      flexDirection:'row',
      backgroundColor: '#fff',
      //paddingTop: 50,
      paddingHorizontal: 12,
      alignItems:'center',
      justifyContent:'center',
      width: '20%'
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: '#444',
      alignSelf: 'center',
      paddingBottom: 24
    },
    item: {
      padding: 10,
      fontSize: 18,
      height: 44,
    },
  });