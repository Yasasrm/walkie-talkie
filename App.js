import React, { useState, useEffect } from "react";
import { Audio } from "expo-av";
import { Vibration } from "react-native";
import {
  StyleSheet,
  View,
  TextInput,
  Button,
  Text,
  ActivityIndicator,
} from "react-native";
import { RadioButton } from "react-native-paper";

const ChatScreen = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesId, setMessagesId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isOnymous, setIsOnymous] = useState(false);
  const [appId, setAppId] = useState("");
  const apiData = require("./config/api.json");
  const [apiConfig, setApiConfig] = useState({
    authKey: "",
    createChannel: "",
    readChannel: "",
    deleteChannel: "",
  });
  const now = new Date();
  const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

  const handleLogin = async () => {
    setLoading(true);

    try {
      setApiConfig(apiData);
      setLoggedIn(true);
      if (isOnymous) {
        setAppId(username);
      } else {
        setAppId("*");
      }
    } catch (error) {
      alert("Invalid Configurations!");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (message !== "") {
      reqJson = { ms: encrypt(message), us: encrypt(appId), tm: time };
      setLoading(true);
      const responseJson = await callWebService(
        apiConfig.createChannel + password,
        "POST",
        JSON.stringify(reqJson),
        apiConfig.authKey
      );
      if (responseJson.status == 200) {
        setMessage("");
      }
    }
  };

  const receiveMessage = async () => {
    const messageRs = await callWebService(
      apiConfig.readChannel + password + "/greaterThan/" + messagesId,
      "GET",
      "",
      apiConfig.authKey
    );
    if (messageRs.status == 200) {
      let newMsgCat = 0;
      const responseJson = await messageRs.json();
      const newMessages = responseJson.map((msg) => ({
        ms: decrypt(msg.ms),
        st:
          decrypt(msg.us) == appId
            ? styles.message_me
            : decrypt(msg.us) == "*"
            ? styles.message_ut
            : styles.message_ot,
        id: msg.id,
        tm: msg.tm,
      }));

      responseJson.forEach((item) => {
        newMsgCat = decrypt(item.us) == appId ? 1 : 2;
      });

      setMessages([...messages, ...newMessages]);
      const maxId = responseJson.reduce(
        (acc, msg) => (msg.id > acc ? msg.id : acc),
        messagesId
      );
      setMessagesId(maxId);
      setLoading(false);

      let knockOut = messagesId - 10;

      if (knockOut > 0) {
        callWebService(
          apiConfig.deleteChannel + password + "/" + knockOut,
          "DELETE",
          "",
          apiConfig.authKey
        );
      }
      let location =
        newMsgCat == 1
          ? require("./assets/pop.mp3")
          : require("./assets/notification.mp3");
      playNotificationSound(location);
      if (newMsgCat == 2) {
        Vibration.vibrate(500);
      }
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn && messagesId == 0) {
      setLoading(true);
    }

    const timer = setInterval(() => {
      if (loggedIn && appId !== "") {
        receiveMessage();
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [messagesId, loggedIn, appId]);

  if (loggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          {messages.map((msg, index) => (
            <View key={msg.id} style={{ flexDirection: "column" }}>
              <Text key={msg.id} style={msg.st}>
                {msg.ms}
              </Text>
              <Text style={styles.message_time}>
                {msg.tm} {msg.us}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message"
            value={message}
            onChangeText={(text) => setMessage(text)}
          />
          <Button title="Send" onPress={sendMessage} />
          <ActivityIndicator size="small" color="black" animating={loading} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container_login}>
      <ActivityIndicator size="small" color="black" animating={loading} />
      <View style={styles.space_y} />
      <TextInput
        style={styles.input_login}
        placeholder="Identifier"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input_login}
        placeholder="Channel"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <View style={styles.radio_btn}>
        <RadioButton
          value="onymous"
          status={isOnymous ? "checked" : "unchecked"}
          onPress={() => setIsOnymous(!isOnymous)}
        />
        <Text>Onymous</Text>
      </View>
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#F5F5F5",
  },
  messageContainer: {
    padding: 10,
    marginBottom: 30,
  },
  message_me: {
    backgroundColor: "#91b7eb",
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
    marginLeft: 50,
  },
  message_ot: {
    backgroundColor: "#eb9191",
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
    marginRight: 50,
  },
  message_ut: {
    backgroundColor: "#bdb9b9",
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
    marginRight: 50,
  },
  message_time: {
    marginLeft: 70,
    marginBottom: 20,
    fontSize: 12,
    color: "#BBBBBB",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#CCCCCC",
  },
  input: {
    flex: 1,
    marginRight: 10,
    padding: 10,
    backgroundColor: "#EEEEEE",
    borderRadius: 10,
  },
  container_login: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input_login: {
    width: "80%",
    marginVertical: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
  },
  space_y: {
    height: 100,
  },
  space_y_sm: {
    height: 20,
  },
  space_x: {
    width: 20,
  },
  radio_btn: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default ChatScreen;

async function callWebService(uri, httpMethod, requestBody, authentication) {
  const response = await fetch(uri, {
    method: httpMethod,
    headers: {
      "Content-Type": "application/json",
      Authorization: authentication,
    },
    body: requestBody == "" ? undefined : requestBody,
  });
  return await response;
}

const encrypt = (text) => {
  const byteArray = [];
  for (let i = 0; i < text.length; ++i) {
    byteArray.push(text.charCodeAt(i));
  }
  return byteArray;
};

const decrypt = (byteArray) => {
  let text = "";
  for (let i = 0; i < byteArray.length; ++i) {
    text += String.fromCharCode(byteArray[i]);
  }
  return text;
};

async function playNotificationSound(location) {
  const soundObject = new Audio.Sound();
  try {
    await soundObject.loadAsync(location);
    await soundObject.playAsync();
  } catch (error) {
    console.error(error);
  }
}
