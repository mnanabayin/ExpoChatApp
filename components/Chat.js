import React, {
    useState,
    useEffect,
    useLayoutEffect,
    useCallback
  } from 'react';
  import { TouchableOpacity, Text, TextInput,StyleSheet ,Button} from 'react-native';
  import { GiftedChat } from 'react-native-gifted-chat';
  import {
    collection,
    addDoc,
    orderBy,
    query,
    onSnapshot,
    deleteDoc
  } from 'firebase/firestore';
  import { signOut } from 'firebase/auth';
  
  import { auth, database } from '../config/firebase';
  
  export default function Chat({ navigation }) {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState("");
    const [showChat, setShowChat] = useState(false);
  
    const onSignOut = () => {
      localStorage.removeItem("createdUsername");
       //delete online presence
       
      signOut(auth).catch(error => console.log('Error logging out: ', error));
    };
  

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
      if(localStorage.getItem("createdUsername") !== null){
        setShowChat(true)
      }  
     }, []);
  
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
        setShowChat(true)
        localStorage.setItem("createdUsername",username)
        addDoc(collection(database, 'online'), {
          userId: auth?.currentUser?.uid,
          username: username??auth?.currentUser?.email.split("@")[0],
          createdAt: new Date().toISOString(),
        });
      }
    };
  
  
  return (
    !(showChat) ? 
     ( 
       <>
      <TextInput
          style={styles.input}
          placeholder='Enter username to begin chat ...'
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
      <GiftedChat
        messages={messages}
        showAvatarForEveryMessage={true}
        onSend={messages => onSend(messages)}
        renderUsernameOnMessage={true}
        user={{
          _id: auth?.currentUser?.email,
          avatar: 'https://i.pravatar.cc/300',
          name: username??auth?.currentUser?.email.split("@")[0]
        }}
      />
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
    }
  });