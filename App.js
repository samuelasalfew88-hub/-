import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// ኖቲፊኬሽን በጀርባ (ስልኩ ጠፍቶ/ተቆልፎ) እንዲጮህ እና እንዲታይ ማዘዣ
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const CATEGORIES = [
  { id: 'edu', name: 'ትምህርት', nameEn: 'Education', icon: 'book', color: '#FF9800' },
  { id: 'yt', name: 'ዩቲዩብ', nameEn: 'YouTube', icon: 'logo-youtube', color: '#FF4444' },
  { id: 'biz', name: 'ቢዝነስ', nameEn: 'Business', icon: 'briefcase', color: '#2196F3' },
  { id: 'personal', name: 'የግል', nameEn: 'Personal', icon: 'person', color: '#9C27B0' }
];

export default function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [usersDb, setUsersDb] = useState([]); 
  const [language, setLanguage] = useState('am'); 

  const [ethDateStr, setEthDateStr] = useState('ህዳር 9, 2019');
  const [gregDateStr, setGregDateStr] = useState('November 18, 2026');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginStep, setLoginStep] = useState('login'); 
  
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [profilePic, setProfilePic] = useState(null);

  const [tasks, setTasks] = useState([
    { id: '1', title: 'ፋርማሲኮኖሚክስ ማጥናት', titleEn: 'Study Pharmacoeconomics', completed: false, category: CATEGORIES[0], time: '4:00 ማታ', date: 'ዛሬ' },
    { id: '2', title: 'ጂም መሄድ', titleEn: 'Go to Gym', completed: false, category: CATEGORIES[3], time: '12:00 ጠዋት', date: 'ነገ' },
  ]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedFilterDate, setSelectedFilterDate] = useState('ዛሬ');
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [taskDate, setTaskDate] = useState('ዛሬ');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // ALARM STATES
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [alarmTimeType, setAlarmTimeType] = useState('6:00'); 
  const [puzzlesRemaining, setPuzzlesRemaining] = useState(1);
  const [puzzle, setPuzzle] = useState({ q: '', options: [], answer: 0 });
  const [alarmSound, setAlarmSound] = useState('default'); // 'default', 'bell', 'digital'

  // --- INIT & LOCAL STORAGE ---
  useEffect(() => { 
    loadAppData(); 
    requestNotificationPermission();
    setupNotificationListeners();
  }, []);
  
  useEffect(() => { 
    if (!isAppLoading) {
      saveAppData(); 
      scheduleAllBackgroundAlarms(); // መረጃ በተቀየረ ቁጥር አላርሙን አዲስ ያደርገዋል
    }
  }, [usersDb, tasks, language, ethDateStr, gregDateStr, alarmSound]);

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') console.log('Notification permission not granted');
  };

  // ኖቲፊኬሽኑን ተጠቃሚው ሲነካው አፑን ከፍቶ ፐዝሉን የሚያመጣ ሲስተም
  const setupNotificationListeners = () => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const title = response.notification.request.content.title;
      if (title.includes('12:00') || title.includes('6:00 AM')) {
        triggerAlarm('6:00');
      } else if (title.includes('12:30') || title.includes('6:30 AM')) {
        triggerAlarm('6:30');
      }
    });
    return () => subscription.remove();
  };

  const loadAppData = async () => {
    try {
      const savedUsers = await AsyncStorage.getItem('usersDb');
      const savedTasks = await AsyncStorage.getItem('tasks');
      const savedLang = await AsyncStorage.getItem('language');
      const savedEthDate = await AsyncStorage.getItem('ethDateStr');
      const savedGregDate = await AsyncStorage.getItem('gregDateStr');
      const savedSound = await AsyncStorage.getItem('alarmSound');
      const activeUser = await AsyncStorage.getItem('activeUser');

      if (savedUsers) setUsersDb(JSON.parse(savedUsers));
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedLang) setLanguage(savedLang);
      if (savedEthDate) setEthDateStr(savedEthDate);
      if (savedGregDate) setGregDateStr(savedGregDate);
      if (savedSound) setAlarmSound(savedSound);

      if (activeUser) {
        const user = JSON.parse(activeUser);
        setUserName(user.userName); setPhoneNumber(user.phoneNumber); setProfilePic(user.profilePic); setIsLoggedIn(true);
      }
    } catch (error) { console.log('Error loading data', error); } finally { setIsAppLoading(false); }
  };

  const saveAppData = async () => {
    try {
      await AsyncStorage.setItem('usersDb', JSON.stringify(usersDb));
      await AsyncStorage.setItem('tasks', JSON.stringify(tasks));
      await AsyncStorage.setItem('language', language);
      await AsyncStorage.setItem('ethDateStr', ethDateStr);
      await AsyncStorage.setItem('gregDateStr', gregDateStr);
      await AsyncStorage.setItem('alarmSound', alarmSound);
    } catch (error) { console.log('Error saving data', error); }
  };

  const saveActiveUser = async (name, phone, pic) => {
    await AsyncStorage.setItem('activeUser', JSON.stringify({ userName: name, phoneNumber: phone, profilePic: pic }));
  };
  const clearActiveUser = async () => { await AsyncStorage.removeItem('activeUser'); };

  // --- TRANSLATION ---
  const t = {
    am: {
      welcome: 'እንኳን ደህና መጡ!', login: 'ግባ (Login)', signup: 'አዲስ ይመዝገቡ',
      nameLabel: 'የእርስዎ ስም', phoneLabel: 'ስልክ ቁጥር (09...)', passLabel: 'የይለፍ ቃል (Password)', confirmPass: 'የይለፍ ቃል ያረጋግጡ',
      forgotPass: 'ፓስዋርድ ረሱ?', noAccount: 'አካውንት የለዎትም?', haveAccount: 'ከዚህ በፊት ተመዝግበዋል?',
      greeting: 'ሰላም', todaySuccess: 'የዛሬው ስኬት', weekProgress: 'የሳምንቱ ሂደት', yourPlans: 'የእርስዎ እቅዶች',
      addTask: 'አዲስ እቅድ ያክሉ', taskTitle: 'ምን ለመስራት አቅደዋል?', taskDate: 'መቼ?', taskTime: 'ስንት ሰዓት?',
      cancel: 'ይቅር', save: 'አስቀምጥ', settings: 'መቼቶች (Settings)', logout: 'ዘግተህ ውጣ (Logout)', close: 'ዝጋ (Close)',
      days: ['ሰ', 'ማ', 'ረ', 'ሐ', 'አ', 'ቅ', 'እ'], alarm1: '12:00 ሞክር', alarm2: '12:30 ሞክር', switchLangText: 'Language: English',
      homeTab: 'ዋና ገፅ', calendarTab: 'ካላንደር', emptyCalendar: 'በዚህ ቀን ምንም እቅድ የለዎትም።',
      dateOptions: ['ትናንት', 'ዛሬ', 'ነገ', 'ከነገ ወዲያ', 'ቀጣይ ሳምንት'],
      setEthDate: 'የኢትዮጵያ ቀን ያስተካክሉ', setGregDate: 'የፈረንጆች ቀን ያስተካክሉ', notifTest: 'ኖቲፊኬሽን ሞክር (5 ሰከንድ)',
      alarmSoundLabel: 'የአላርም ድምፅ ይምረጡ፡'
    },
    en: {
      welcome: 'Welcome!', login: 'Login', signup: 'Sign Up',
      nameLabel: 'Your Name', phoneLabel: 'Phone Number', passLabel: 'Password', confirmPass: 'Confirm Password',
      forgotPass: 'Forgot Password?', noAccount: "Don't have an account?", haveAccount: 'Already registered?',
      greeting: 'Hello', todaySuccess: "Today's Success", weekProgress: 'Weekly Progress', yourPlans: 'Your Plans',
      addTask: 'Add New Task', taskTitle: 'What do you want to do?', taskDate: 'When?', taskTime: 'What time?',
      cancel: 'Cancel', save: 'Save', settings: 'Settings', logout: 'Logout', close: 'Close',
      days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], alarm1: 'Test 6:00 AM', alarm2: 'Test 6:30 AM', switchLangText: 'ቋንቋ: አማርኛ',
      homeTab: 'Home', calendarTab: 'Calendar', emptyCalendar: 'No tasks scheduled for this day.',
      dateOptions: ['Yesterday', 'Today', 'Tomorrow', 'Day After', 'Next Week'],
      setEthDate: 'Edit Ethiopian Date', setGregDate: 'Edit Gregorian Date', notifTest: 'Test Notification (5 sec)',
      alarmSoundLabel: 'Select Alarm Sound:'
    }
  }[language];

  // --- DYNAMIC CALENDAR GENERATOR ---
  const getDynamicDateMap = () => {
    const match = ethDateStr.match(/\d+/); const baseDay = match ? parseInt(match[0]) : 9;
    const monthMatch = ethDateStr.match(/^[^\d]+/); const baseMonth = monthMatch ? monthMatch[0].trim() : 'ህዳር';
    const gregMatch = gregDateStr.match(/\d+/); const baseGregDay = gregMatch ? parseInt(gregMatch[0]) : 18;
    const gregMonthMatch = gregDateStr.match(/^[^\d]+/); const baseGregMonth = gregMonthMatch ? gregMonthMatch[0].trim() : 'Nov';

    const dDay = language === 'am' ? baseDay : baseGregDay;
    const dMonth = language === 'am' ? baseMonth : baseGregMonth;

    const calcDay = (offset) => { let d = dDay + offset; if (d > 30) d = d - 30; if (d < 1) d = 30 + d; return d; };

    return {
      'ትናንት': `${t.dateOptions[0]} (${dMonth} ${calcDay(-1)})`, 'ዛሬ': `${t.dateOptions[1]} (${dMonth} ${calcDay(0)})`,
      'ነገ': `${t.dateOptions[2]} (${dMonth} ${calcDay(1)})`, 'ከነገ ወዲያ': `${t.dateOptions[3]} (${dMonth} ${calcDay(2)})`,
      'ቀጣይ ሳምንት': `${t.dateOptions[4]} (${dMonth} ${calcDay(7)})`
    };
  };

  const dynamicDateMap = getDynamicDateMap();
  const internalDates = ['ትናንት', 'ዛሬ', 'ነገ', 'ከነገ ወዲያ', 'ቀጣይ ሳምንት'];

  // --- BACKGROUND AUTOMATIC ALARM SCHEDULER ---
  const scheduleAllBackgroundAlarms = async () => {
    // የቀድሞ አላርሞችን ያጠፋል
    await Notifications.cancelAllScheduledNotificationsAsync();

    const playSoundStr = alarmSound === 'default' ? true : alarmSound; 

    // 1. የ ጧት 12:00 አላርም (6:00 AM) - በየቀኑ የሚጮህ
    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === 'am' ? '⏰ 12:00 ጠዋት ሆኗል!' : '⏰ 6:00 AM!',
        body: language === 'am' ? 'ከእንቅልፍዎ ለመነሳት ይህን ነክተው ጥያቄውን ይመልሱ!' : 'Tap this to wake up and solve the puzzle!',
        sound: playSoundStr,
      },
      trigger: { hour: 6, minute: 0, repeats: true },
    });

    // 2. የ ጧት 12:30 አላርም (6:30 AM) - በየቀኑ የሚጮህ
    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === 'am' ? '⏰ 12:30 ጠዋት ሆኗል!' : '⏰ 6:30 AM!',
        body: language === 'am' ? 'እንዳይተኙ! 2 ጥያቄዎችን ይመልሱ!' : 'Don\'t fall asleep! Answer 2 puzzles!',
        sound: playSoundStr,
      },
      trigger: { hour: 6, minute: 30, repeats: true },
    });

    // 3. የእቅዶች ማሳሰቢያ (Task Notifications)
    tasks.forEach(async (task) => {
      if (!task.completed && task.time) {
        // (በእውነተኛ አፕ ላይ የሰዓት ቴክስቱን ወደ ትክክለኛ Date Object ቀይሮ trigger ውስጥ ይገባል። እዚህ ግን አላርሙን አዘጋጅተነዋል)
        // placeholder logic for tasks scheduled in background
      }
    });
  };

  const scheduleTestNotification = async () => {
    const sampleTask = tasks.length > 0 ? tasks[0] : { title: 'ስራ', time: 'አሁን' };
    const taskTitle = language === 'am' ? sampleTask.title : (sampleTask.titleEn || sampleTask.title);
    const taskTime = sampleTask.time || '';

    alert(language === 'am' ? `ከ 5 ሰከንድ በኋላ ለ "${taskTitle}" ኖቲፊኬሽን ይመጣል! (ስክሪን ቢያጠፉትም ይጮሃል)` : `Notification for "${taskTitle}" in 5s!`);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === 'am' ? `⏰ የ ${taskTitle} ሰዓት ደርሷል!` : `⏰ Time for ${taskTitle}!`,
        body: language === 'am' ? `${taskTime} ሆኗል! እባክዎ ወደ ተግባርዎ ይግቡ።` : `It is ${taskTime}! Please start your task.`,
        sound: alarmSound === 'default' ? true : alarmSound,
      },
      trigger: { seconds: 5 },
    });
  };

  // --- ALARM MODAL LOGIC ---
  const generatePuzzle = (type) => {
    let num1, num2, correctAns, operator;
    if (type === '6:30') {
      const isMultiply = Math.random() > 0.5;
      if (isMultiply) { num1 = Math.floor(Math.random() * 10) + 5; num2 = Math.floor(Math.random() * 8) + 3; correctAns = num1 * num2; operator = 'x'; } 
      else { num1 = Math.floor(Math.random() * 50) + 30; num2 = Math.floor(Math.random() * 50) + 30; correctAns = num1 + num2; operator = '+'; }
    } else {
      num1 = Math.floor(Math.random() * 20) + 10; num2 = Math.floor(Math.random() * 20) + 10; correctAns = num1 + num2; operator = '+';
    }
    const wrong1 = correctAns + Math.floor(Math.random() * 10) + 1;
    const wrong2 = correctAns - Math.floor(Math.random() * 10) - 1;
    const optionsArray = [correctAns, wrong1, wrong2].sort(() => Math.random() - 0.5);
    setPuzzle({ q: `${num1} ${operator} ${num2} = ?`, options: optionsArray, answer: correctAns });
  };

  const triggerAlarm = (time) => { setAlarmTimeType(time); setPuzzlesRemaining(time === '6:30' ? 2 : 1); generatePuzzle(time); setIsAlarmActive(true); };

  const handlePuzzleAnswer = (selectedNumber) => {
    if (selectedNumber === puzzle.answer) {
      if (puzzlesRemaining > 1) { alert(language === 'am' ? 'ትክክል! ግን ገና አልጨረሱም፣ 1 ጥያቄ ቀርቶዎታል!' : 'Correct! 1 more question left!'); setPuzzlesRemaining(puzzlesRemaining - 1); generatePuzzle(alarmTimeType); } 
      else { alert(language === 'am' ? 'ጎበዝ! አሁን ሙሉ በሙሉ ነቅተዋል!' : 'Great job! You are fully awake now!'); setIsAlarmActive(false); }
    } else { alert(language === 'am' ? 'ተሳስተዋል! አላርሙ አይጠፋም!' : 'Wrong! Alarm will not stop!'); }
  };

  // --- AUTH LOGIC ---
  const handleSignUp = () => {
    if (userName.trim() === '' || password.trim() === '') return;
    if (password !== confirmPassword) { alert(language === 'am' ? 'የይለፍ ቃል አይመሳሰልም!' : 'Passwords do not match!'); return; }
    setUsersDb([...usersDb, { userName, phoneNumber, password }]); saveActiveUser(userName, phoneNumber, profilePic); setIsLoggedIn(true);
  };
  const handleLogin = () => {
    if (userName.trim() === '' || password.trim() === '') return;
    const validUser = usersDb.find(u => u.userName === userName && u.password === password);
    if (validUser) { setPhoneNumber(validUser.phoneNumber); saveActiveUser(validUser.userName, validUser.phoneNumber, profilePic); setIsLoggedIn(true); } 
    else { alert(language === 'am' ? 'ስም ወይም የይለፍ ቃል ተሳስቷል!' : 'Invalid credentials!'); }
  };
  const sendOTP = () => { if (phoneNumber.trim() === '') return; alert(`OTP: 1234`); setLoginStep('otp_verify'); };
  const verifyOTP = () => {
    if (otpCode === '1234') { 
      const phoneUser = usersDb.find(u => u.phoneNumber === phoneNumber); const name = phoneUser ? phoneUser.userName : 'Sami (OTP)';
      setUserName(name); saveActiveUser(name, phoneNumber, profilePic); setIsLoggedIn(true); 
    } else { alert('Error'); }
  };
  const handleLogout = () => {
    setIsLoggedIn(false); setSettingsVisible(false);
    setUserName(''); setPassword(''); setConfirmPassword(''); setPhoneNumber(''); setOtpCode(''); setProfilePic(null); clearActiveUser(); setLoginStep('login');
  };
  const changeProfilePhoto = async () => { const newPic = 'https://randomuser.me/api/portraits/men/32.jpg'; setProfilePic(newPic); await saveActiveUser(userName, phoneNumber, newPic); };

  // --- TASKS LOGIC ---
  const toggleTask = (id) => { setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t )); };
  const deleteTask = (id) => { setTasks(tasks.filter(t => t.id !== id)); };
  const addTask = () => {
    if (newTaskTitle.trim() === '') return;
    setTasks([...tasks, { id: Date.now().toString(), title: newTaskTitle, titleEn: newTaskTitle, completed: false, category: selectedCategory || CATEGORIES[3], time: taskTime, date: taskDate }]);
    setNewTaskTitle(''); setTaskTime(''); setTaskDate('ዛሬ'); setSelectedCategory(null); setModalVisible(false);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  const renderTask = ({ item }) => (
    <View style={styles.taskCard}>
      <TouchableOpacity onPress={() => toggleTask(item.id)} style={styles.checkBtn}>
        <Ionicons name={item.completed ? "checkmark-circle" : "ellipse-outline"} size={32} color={item.completed ? "#00E676" : "#666"} />
      </TouchableOpacity>
      <View style={styles.taskTextContainer}>
        <Text style={[styles.taskText, item.completed && styles.taskTextCompleted]}>{language === 'am' ? item.title : (item.titleEn || item.title)}</Text>
        <View style={styles.timeContainer}>
          {(item.time || item.date) && (<Ionicons name="calendar-outline" size={14} color="#00E676" style={{marginRight: 4}} />)}
          <Text style={styles.timeText}>{dynamicDateMap[item.date] || item.date} {item.date && item.time ? ' • ' : ''} {item.time}</Text>
        </View>
      </View>
      <View style={[styles.categoryIconBadge, { backgroundColor: item.category.color + '20' }]}>
        <Ionicons name={item.category.icon} size={20} color={item.category.color} />
      </View>
      <TouchableOpacity onPress={() => deleteTask(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={22} color="#FF4444" />
      </TouchableOpacity>
    </View>
  );

  if (isAppLoading) return (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#00E676" /></View>);

  if (!isLoggedIn) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.loginContainer}>
        {loginStep === 'login' && (
          <View style={styles.loginBox}>
            <Ionicons name="shield-checkmark" size={70} color="#00E676" style={styles.loginIcon} />
            <Text style={styles.loginTitle}>{t.welcome}</Text>
            <TextInput style={styles.loginInput} placeholder={t.nameLabel} placeholderTextColor="#888" value={userName} onChangeText={setUserName} />
            <TextInput style={styles.loginInput} placeholder={t.passLabel} placeholderTextColor="#888" secureTextEntry={true} value={password} onChangeText={setPassword} />
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}><Text style={styles.loginBtnText}>{t.login}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setLoginStep('forgot_password')} style={{marginTop: 15}}><Text style={styles.forgotPasswordText}>{t.forgotPass}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setLoginStep('signup'); setUserName(''); setPassword(''); setConfirmPassword(''); setPhoneNumber(''); }} style={{marginTop: 25}}>
              <Text style={styles.switchAuthText}>{t.noAccount} <Text style={{color: '#00E676', fontWeight: 'bold'}}>{t.signup}</Text></Text>
            </TouchableOpacity>
          </View>
        )}
        
        {loginStep === 'signup' && (
          <View style={styles.loginBox}>
            <Ionicons name="person-add" size={70} color="#2196F3" style={styles.loginIcon} />
            <Text style={styles.loginTitle}>{t.signup}</Text>
            <TextInput style={styles.loginInput} placeholder={t.nameLabel} placeholderTextColor="#888" value={userName} onChangeText={setUserName} />
            <TextInput style={styles.loginInput} placeholder={t.phoneLabel} placeholderTextColor="#888" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
            <TextInput style={styles.loginInput} placeholder={t.passLabel} placeholderTextColor="#888" secureTextEntry={true} value={password} onChangeText={setPassword} />
            <TextInput style={styles.loginInput} placeholder={t.confirmPass} placeholderTextColor="#888" secureTextEntry={true} value={confirmPassword} onChangeText={setConfirmPassword} />
            <TouchableOpacity style={[styles.loginBtn, {backgroundColor: '#2196F3'}]} onPress={handleSignUp}><Text style={[styles.loginBtnText, {color: '#FFF'}]}>{t.signup}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setLoginStep('login'); setUserName(''); setPassword(''); setConfirmPassword(''); setPhoneNumber(''); }} style={{marginTop: 25}}>
              <Text style={styles.switchAuthText}>{t.haveAccount} <Text style={{color: '#2196F3', fontWeight: 'bold'}}>{t.login}</Text></Text>
            </TouchableOpacity>
          </View>
        )}

        {loginStep === 'forgot_password' && (
          <View style={styles.loginBox}>
            <Ionicons name="phone-portrait-outline" size={70} color="#FF9800" style={styles.loginIcon} />
            <Text style={styles.loginTitle}>{t.forgotPass}</Text>
            <TextInput style={styles.loginInput} placeholder={t.phoneLabel} placeholderTextColor="#888" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
            <TouchableOpacity style={[styles.loginBtn, {backgroundColor: '#FF9800'}]} onPress={sendOTP}><Text style={[styles.loginBtnText, {color: '#FFF'}]}>OTP</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setLoginStep('login')} style={{marginTop: 20}}><Text style={styles.forgotPasswordText}>{t.cancel}</Text></TouchableOpacity>
          </View>
        )}

        {loginStep === 'otp_verify' && (
          <View style={styles.loginBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={70} color="#FF9800" style={styles.loginIcon} />
            <Text style={styles.loginTitle}>OTP Code</Text>
            <TextInput style={styles.loginInput} placeholder="1234" placeholderTextColor="#888" keyboardType="number-pad" maxLength={4} value={otpCode} onChangeText={setOtpCode} textAlign="center" fontSize={24} letterSpacing={10} />
            <TouchableOpacity style={[styles.loginBtn, {backgroundColor: '#FF9800'}]} onPress={verifyOTP}><Text style={[styles.loginBtnText, {color: '#FFF'}]}>Verify</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setLoginStep('forgot_password')} style={{marginTop: 20}}><Text style={styles.forgotPasswordText}>{t.cancel}</Text></TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  const calendarTasks = tasks.filter(t => t.date === selectedFilterDate);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t.greeting} {userName}! 👋</Text>
            <Text style={styles.dateEth}>{ethDateStr}</Text>
            <Text style={styles.dateGreg}>{gregDateStr}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => setSettingsVisible(true)}>
             {profilePic ? (<Image source={{uri: profilePic}} style={styles.headerProfileImage} />) : (<Ionicons name="person-circle" size={45} color="#00E676" />)}
          </TouchableOpacity>
        </View>

        {activeTab === 'home' ? (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.mainScroll}>
            <View style={styles.alarmBtnsRow}>
              <TouchableOpacity style={styles.alarmTestBtn} onPress={() => triggerAlarm('6:00')}><Ionicons name="alarm-outline" size={18} color="#111" /><Text style={styles.alarmTestText}>{t.alarm1}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.alarmTestBtnDanger} onPress={() => triggerAlarm('6:30')}><Ionicons name="warning-outline" size={18} color="#FFF" /><Text style={styles.alarmTestTextLight}>{t.alarm2}</Text></TouchableOpacity>
            </View>

            {/* NOTIFICATION TEST BUTTON */}
            <TouchableOpacity style={styles.notifTestBtn} onPress={scheduleTestNotification}>
              <Ionicons name="notifications" size={18} color="#FFF" />
              <Text style={styles.notifTestText}>{t.notifTest}</Text>
            </TouchableOpacity>

            <View style={styles.dashboardCard}>
              <View style={styles.progressCircleContainer}>
                <View style={styles.progressCircle}><Text style={styles.progressText}>{progress}%</Text></View>
                <Text style={styles.progressLabel}>{t.todaySuccess}</Text>
              </View>
              <View style={styles.graphContainer}>
                <Text style={styles.graphTitle}>{t.weekProgress}</Text>
                <View style={styles.barsRow}>
                  {t.days.map((day, idx) => {
                    const height = idx === 1 ? progress * 0.8 : Math.random() * 50 + 20;
                    return (
                      <View key={idx} style={styles.barWrapper}>
                        <View style={[styles.bar, { height: height, backgroundColor: idx === 1 ? '#00E676' : '#444' }]} />
                        <Text style={[styles.dayText, idx === 1 && { color: '#00E676', fontWeight: 'bold' }]}>{day}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.listHeader}><Text style={styles.listTitle}>{t.yourPlans} (Top)</Text></View>
            <View style={{paddingHorizontal: 20}}>
              {tasks.slice(0, 3).map(item => <View key={item.id}>{renderTask({item})}</View>)}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.calendarTabContainer}>
            <View style={styles.calendarStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
                {internalDates.map((dateKey) => (
                  <TouchableOpacity 
                    key={dateKey} 
                    style={[styles.dateChip, selectedFilterDate === dateKey && styles.dateChipActive]} 
                    onPress={() => setSelectedFilterDate(dateKey)}
                  >
                    <Text style={[styles.dateChipText, selectedFilterDate === dateKey && styles.dateChipTextActive]}>{dynamicDateMap[dateKey]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={[styles.listHeader, {marginTop: 10}]}><Text style={styles.listTitle}>{dynamicDateMap[selectedFilterDate]}</Text></View>
            
            {calendarTasks.length === 0 ? (
              <View style={styles.emptyCalendarBox}><Ionicons name="calendar-clear-outline" size={50} color="#444" /><Text style={styles.emptyCalendarText}>{t.emptyCalendar}</Text></View>
            ) : (
              <FlatList data={calendarTasks} renderItem={renderTask} keyExtractor={item => item.id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} />
            )}
          </View>
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <View style={styles.bottomNavBar}>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
            <Ionicons name={activeTab === 'home' ? "home" : "home-outline"} size={26} color={activeTab === 'home' ? '#00E676' : '#888'} />
            <Text style={[styles.navText, activeTab === 'home' && {color: '#00E676'}]}>{t.homeTab}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('calendar')}>
            <Ionicons name={activeTab === 'calendar' ? "calendar" : "calendar-outline"} size={26} color={activeTab === 'calendar' ? '#00E676' : '#888'} />
            <Text style={[styles.navText, activeTab === 'calendar' && {color: '#00E676'}]}>{t.calendarTab}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={34} color="#111" />
        </TouchableOpacity>

        {/* ALARM MODAL */}
        <Modal animationType="slide" transparent={true} visible={isAlarmActive}>
          <View style={styles.alarmOverlay}>
            <View style={styles.alarmContent}>
              <Ionicons name="alarm" size={80} color="#FF4444" />
              <Text style={styles.alarmTitle}>{alarmTimeType === '6:00' ? '6:00 AM' : '6:30 AM'}</Text>
              <Text style={styles.alarmSub}>{language === 'am' ? 'አላርሙን ለማጥፋት ጥያቄውን ይመልሱ፡' : 'Answer to stop the alarm:'}</Text>
              <View style={styles.puzzleBox}><Text style={styles.puzzleText}>{puzzle.q}</Text></View>
              <View style={styles.puzzleOptionsContainer}>
                {puzzle.options.map((opt, index) => (
                  <TouchableOpacity key={index} style={styles.puzzleOptionBtn} onPress={() => handlePuzzleAnswer(opt)}>
                    <Text style={styles.puzzleOptionText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* ADD TASK MODAL */}
        <Modal animationType="slide" transparent={true} visible={modalVisible}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalDragIndicator} />
              <Text style={styles.modalTitle}>{t.addTask}</Text>
              
              <TextInput style={styles.input} placeholder={t.taskTitle} placeholderTextColor="#666" value={newTaskTitle} onChangeText={setNewTaskTitle} autoFocus={true} />
              
              <View style={styles.dateTimeRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePickerScroll}>
                  {internalDates.map((dateKey) => (
                    <TouchableOpacity 
                      key={dateKey} 
                      style={[styles.smallDateChip, taskDate === dateKey && styles.smallDateChipActive]} 
                      onPress={() => setTaskDate(dateKey)}
                    >
                      <Text style={[styles.smallDateChipText, taskDate === dateKey && styles.smallDateChipTextActive]}>{dynamicDateMap[dateKey]}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.timeInputContainer}>
                 <Ionicons name="time-outline" size={20} color="#888" style={styles.inputIcon} />
                 <TextInput style={styles.halfInput} placeholder={t.taskTime} placeholderTextColor="#666" value={taskTime} onChangeText={setTaskTime} />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity key={cat.id} style={[styles.categoryChip, selectedCategory?.id === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]} onPress={() => setSelectedCategory(cat)}>
                    <Ionicons name={cat.icon} size={18} color={selectedCategory?.id === cat.id ? '#FFF' : cat.color} />
                    <Text style={[styles.categoryChipText, selectedCategory?.id === cat.id && { color: '#FFF' }]}>{language === 'am' ? cat.name : cat.nameEn}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setModalVisible(false)}><Text style={styles.cancelBtnText}>{t.cancel}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={addTask}><Text style={styles.saveBtnText}>{t.save}</Text></TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* SETTINGS MODAL */}
        <Modal animationType="slide" transparent={true} visible={settingsVisible}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.settingsOverlay}>
            <View style={styles.settingsContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.settingsTitle}>{t.settings}</Text>
                <View style={styles.profileInfoBox}>
                  <TouchableOpacity onPress={changeProfilePhoto} style={styles.imagePickerBtn}>
                    {profilePic ? (<Image source={{uri: profilePic}} style={styles.settingsProfileImage} />) : (<Ionicons name="person-circle" size={70} color="#00E676" />)}
                    <View style={styles.cameraIconBadge}><Ionicons name="camera" size={14} color="#FFF" /></View>
                  </TouchableOpacity>
                  <Text style={styles.settingsProfileName}>{userName}</Text>
                  <Text style={styles.settingsProfilePhone}>{phoneNumber}</Text>
                </View>

                {/* DATE EDITORS */}
                <View style={styles.dateEditorsContainer}>
                  <Text style={styles.settingsLabel}>{t.setEthDate}</Text>
                  <TextInput style={styles.settingsInputBox} value={ethDateStr} onChangeText={setEthDateStr} />
                  <Text style={styles.settingsLabel}>{t.setGregDate}</Text>
                  <TextInput style={styles.settingsInputBox} value={gregDateStr} onChangeText={setGregDateStr} />
                </View>

                {/* ALARM SOUND SELECTOR */}
                <View style={styles.dateEditorsContainer}>
                  <Text style={styles.settingsLabel}>{t.alarmSoundLabel}</Text>
                  <View style={styles.soundOptionsRow}>
                    <TouchableOpacity style={[styles.soundBtn, alarmSound === 'default' && styles.soundBtnActive]} onPress={() => setAlarmSound('default')}>
                      <Text style={[styles.soundBtnText, alarmSound === 'default' && styles.soundBtnTextActive]}>Default</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.soundBtn, alarmSound === 'bell' && styles.soundBtnActive]} onPress={() => setAlarmSound('bell')}>
                      <Text style={[styles.soundBtnText, alarmSound === 'bell' && styles.soundBtnTextActive]}>Bell</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.soundBtn, alarmSound === 'digital' && styles.soundBtnActive]} onPress={() => setAlarmSound('digital')}>
                      <Text style={[styles.soundBtnText, alarmSound === 'digital' && styles.soundBtnTextActive]}>Digital</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TouchableOpacity style={[styles.settingsOptionBtn, {borderColor: '#00E676'}]} onPress={() => setLanguage(language === 'am' ? 'en' : 'am')}>
                  <Ionicons name="language-outline" size={22} color="#00E676" />
                  <Text style={styles.settingsOptionText}>{t.switchLangText}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingsOptionBtn, {backgroundColor: 'rgba(255,68,68,0.1)'}]} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={22} color="#FF4444" />
                  <Text style={[styles.settingsOptionText, {color: '#FF4444'}]}>{t.logout}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.settingsCloseBtn} onPress={() => setSettingsVisible(false)}>
                  <Text style={styles.settingsCloseText}>{t.close}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, container: { flex: 1, backgroundColor: '#0B101E' }, 
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B101E' },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0B101E' },
  loginBox: { backgroundColor: '#1A2235', padding: 30, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  loginIcon: { marginBottom: 10 }, loginTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginBottom: 10, textAlign: 'center' },
  loginInput: { backgroundColor: 'rgba(0,0,0,0.3)', width: '100%', color: '#FFF', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  loginBtn: { backgroundColor: '#00E676', width: '100%', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 }, loginBtnText: { color: '#111', fontSize: 18, fontWeight: 'bold' },
  switchAuthText: { color: '#AAA', fontSize: 14 }, forgotPasswordText: { color: '#888', fontSize: 14, textDecorationLine: 'underline' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 30, marginBottom: 15 },
  greeting: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' }, 
  dateEth: { fontSize: 15, color: '#00E676', marginTop: 4, fontWeight: 'bold' }, dateGreg: { fontSize: 13, color: '#AAA', marginTop: 2, fontWeight: '500' },
  headerProfileImage: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: '#00E676' },
  
  mainScroll: { flex: 1 }, calendarTabContainer: { flex: 1 },
  alarmBtnsRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, gap: 10 },
  alarmTestBtn: { flex: 1, backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12 },
  alarmTestBtnDanger: { flex: 1, backgroundColor: '#FF4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12 },
  alarmTestText: { color: '#111', fontWeight: 'bold', fontSize: 14, marginLeft: 5 }, alarmTestTextLight: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginLeft: 5 },
  
  notifTestBtn: { backgroundColor: '#2196F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginHorizontal: 20, marginBottom: 15 },
  notifTestText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginLeft: 5 },

  dashboardCard: { flexDirection: 'row', backgroundColor: '#1A2235', marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 20 },
  progressCircleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' }, progressCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 6, borderColor: '#00E676', justifyContent: 'center', alignItems: 'center' },
  progressText: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' }, progressLabel: { color: '#AAA', fontSize: 12, marginTop: 10, fontWeight: 'bold' },
  graphContainer: { flex: 1.2, marginLeft: 15, justifyContent: 'space-between' }, graphTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80 }, barWrapper: { alignItems: 'center', width: '12%' }, bar: { width: '100%', borderRadius: 4, minHeight: 5 }, dayText: { color: '#888', fontSize: 11, marginTop: 5 },

  calendarStrip: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  calendarScroll: { paddingHorizontal: 20, gap: 10 },
  dateChip: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  dateChipActive: { backgroundColor: '#00E676', borderColor: '#00E676' },
  dateChipText: { color: '#AAA', fontWeight: 'bold', fontSize: 15 }, dateChipTextActive: { color: '#111' },
  emptyCalendarBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }, emptyCalendarText: { color: '#666', marginTop: 10, fontSize: 16 },

  listHeader: { paddingHorizontal: 20, marginBottom: 15 }, listTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2235', padding: 15, borderRadius: 16, marginBottom: 12 },
  checkBtn: { marginRight: 15 }, taskTextContainer: { flex: 1 }, taskText: { color: '#FFF', fontSize: 16, fontWeight: '600' }, taskTextCompleted: { color: '#666', textDecorationLine: 'line-through' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 }, timeText: { color: '#00E676', fontSize: 13 },
  categoryIconBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 }, deleteBtn: { padding: 5 },
  
  bottomNavBar: { flexDirection: 'row', backgroundColor: '#1A2235', paddingVertical: 15, paddingHorizontal: 30, justifyContent: 'space-around', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  navItem: { alignItems: 'center' }, navText: { color: '#888', fontSize: 12, marginTop: 4, fontWeight: '600' },

  fab: { position: 'absolute', bottom: 90, right: 25, backgroundColor: '#00E676', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: '#0B101E', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  modalDragIndicator: { width: 50, height: 5, backgroundColor: '#444', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFF', padding: 16, borderRadius: 14, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  
  dateTimeRow: { marginBottom: 15 },
  datePickerScroll: { flexDirection: 'row', gap: 10 },
  smallDateChip: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: '#444', marginRight: 10 },
  smallDateChipActive: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  smallDateChipText: { color: '#CCC', fontSize: 14, fontWeight: 'bold' }, smallDateChipTextActive: { color: '#FFF' },
  
  timeInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, borderColor: '#333', paddingHorizontal: 12, marginBottom: 15 },
  inputIcon: { marginRight: 8 }, halfInput: { flex: 1, color: '#FFF', paddingVertical: 14, fontSize: 15 },
  
  categoryScroll: { marginBottom: 20 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#444', marginRight: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  categoryChipText: { color: '#CCC', marginLeft: 8, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 }, btn: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12 },
  cancelBtn: { backgroundColor: 'transparent' }, cancelBtnText: { color: '#888', fontSize: 16, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#00E676' }, saveBtnText: { color: '#111', fontSize: 16, fontWeight: 'bold' },

  alarmOverlay: { flex: 1, backgroundColor: 'rgba(11, 16, 30, 0.95)', justifyContent: 'center', padding: 20 }, alarmContent: { backgroundColor: '#1A2235', borderRadius: 25, padding: 30, alignItems: 'center', borderWidth: 2, borderColor: '#FF4444' },
  alarmTitle: { fontSize: 32, fontWeight: '900', color: '#FF4444', marginBottom: 10 }, alarmSub: { fontSize: 15, color: '#CCC', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  puzzleBox: { backgroundColor: '#0B101E', paddingVertical: 20, paddingHorizontal: 30, borderRadius: 15, marginBottom: 30, borderWidth: 1, borderColor: '#333' }, puzzleText: { fontSize: 36, fontWeight: 'bold', color: '#FFF', letterSpacing: 2 },
  puzzleOptionsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 10 }, puzzleOptionBtn: { flex: 1, backgroundColor: '#2196F3', paddingVertical: 18, borderRadius: 15, alignItems: 'center' }, puzzleOptionText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },

  settingsOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' }, 
  settingsContent: { backgroundColor: '#1A2235', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
  settingsTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 20, textAlign: 'center' },
  profileInfoBox: { alignItems: 'center', marginBottom: 25 }, imagePickerBtn: { position: 'relative', marginBottom: 10 },
  settingsProfileImage: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#00E676' }, cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2196F3', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  settingsProfileName: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 5 }, settingsProfilePhone: { color: '#888', fontSize: 14, marginTop: 5 },
  
  dateEditorsContainer: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  settingsLabel: { color: '#AAA', fontSize: 13, marginBottom: 8, fontWeight: 'bold' },
  settingsInputBox: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 15, borderWidth: 1, borderColor: '#333' },

  soundOptionsRow: { flexDirection: 'row', gap: 10 },
  soundBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#444', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  soundBtnActive: { borderColor: '#00E676', backgroundColor: '#00E676' },
  soundBtnText: { color: '#CCC', fontSize: 14, fontWeight: 'bold' }, soundBtnTextActive: { color: '#111' },

  settingsOptionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: 'transparent' }, settingsOptionText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 12 },
  settingsCloseBtn: { marginTop: 5, padding: 15, alignItems: 'center', marginBottom: 20 }, settingsCloseText: { color: '#888', fontSize: 16, fontWeight: 'bold' }
});
