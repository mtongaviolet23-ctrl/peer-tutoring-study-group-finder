import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

const apiRequest = async (path, options = {}, token) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'The request could not be completed.');
  }
  return payload;
};

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('home');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [tutors, setTutors] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [tutorCourseFilter, setTutorCourseFilter] = useState('');
  const [tutorSchoolFilter, setTutorSchoolFilter] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', department: '', programOfStudy: '', studentNumber: '' });
  const [selectedTutorId, setSelectedTutorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [profile, setProfile] = useState({ name: '', department: '', programOfStudy: '', studentNumber: '' });
  const [messageText, setMessageText] = useState('');
  const [messageReceiver, setMessageReceiver] = useState('');
  const [error, setError] = useState('');

  const loadSession = async () => {
    const savedToken = await AsyncStorage.getItem('authToken');
    const savedUser = await AsyncStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setProfile({
        name: JSON.parse(savedUser).name,
        department: JSON.parse(savedUser).department || '',
        programOfStudy: JSON.parse(savedUser).programOfStudy || '',
        studentNumber: JSON.parse(savedUser).studentNumber || '',
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSession();
  }, []);

  const loadData = async () => {
    if (!token) return;
    try {
      const [tutorResult, groupResult, messageResult] = await Promise.all([
        apiRequest('/tutors', {}, token),
        apiRequest('/groups', {}, token),
        apiRequest('/messages', {}, token),
      ]);
      setTutors(tutorResult.data || []);
      setGroups(groupResult.data || []);
      setMessages(messageResult.data || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const persistSession = async (nextToken, nextUser) => {
    await AsyncStorage.setItem('authToken', nextToken);
    await AsyncStorage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setProfile({
      name: nextUser.name,
      department: nextUser.department || '',
      programOfStudy: nextUser.programOfStudy || '',
      studentNumber: nextUser.studentNumber || '',
    });
    setScreen('home');
  };

  const handleAuth = async () => {
    setError('');
    setAuthLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      await persistSession(payload.data.token, payload.data.user);
      Alert.alert('Success', authMode === 'login' ? 'Welcome back.' : 'Account created successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setScreen('auth');
    setAuthMode('login');
  };

  const loadProfile = async () => {
    try {
      const result = await apiRequest('/auth/profile', {}, token);
      const nextProfile = result.data;
      setProfile({
        name: nextProfile.name,
        department: nextProfile.department || '',
        programOfStudy: nextProfile.programOfStudy || '',
        studentNumber: nextProfile.studentNumber || '',
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveProfile = async () => {
    try {
      const result = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      }, token);
      const updatedUser = { ...user, ...result.data };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      Alert.alert('Profile updated', 'Your account details were saved.');
      setScreen('home');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const bookSession = async () => {
    if (!selectedTutorId || !bookingDate) {
      Alert.alert('Missing details', 'Choose a tutor and session date.');
      return;
    }
    try {
      await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          tutorId: Number(selectedTutorId),
          courseCode: tutors.find((tutor) => tutor.id === Number(selectedTutorId))?.courseCode || '',
          date: bookingDate,
          notes: bookingNotes,
        }),
      }, token);
      Alert.alert('Session booked', 'Your tutoring session was created.');
      setBookingNotes('');
      setBookingDate('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const createGroup = async () => {
    const group = { name: 'New Study Group', courseCode: 'CS101', department: 'School of Natural Sciences', members: 4 };
    try {
      await apiRequest('/groups', { method: 'POST', body: JSON.stringify(group) }, token);
      Alert.alert('Group created', 'The study group was added.');
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !messageReceiver) return;
    try {
      await apiRequest('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiver: messageReceiver, content: messageText }),
      }, token);
      setMessageText('');
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const tutorCourses = useMemo(
    () => [...new Set(tutors.map((tutor) => tutor.courseCode).filter(Boolean))].sort(),
    [tutors],
  );
  const tutorSchools = useMemo(
    () => [...new Set(tutors.map((tutor) => tutor.department).filter(Boolean))].sort(),
    [tutors],
  );
  const filteredTutors = useMemo(() => {
    const term = search.toLowerCase();
    return tutors.filter((tutor) =>
      (!term || `${tutor.name} ${tutor.courseCode} ${tutor.department}`.toLowerCase().includes(term)) &&
      (!tutorCourseFilter || tutor.courseCode === tutorCourseFilter) &&
      (!tutorSchoolFilter || tutor.department === tutorSchoolFilter)
    );
  }, [search, tutors, tutorCourseFilter, tutorSchoolFilter]);

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#1d4ed8" /></SafeAreaView>;
  }

  if (!token || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.authContainer}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>UNZA</Text></View>
          <Text style={styles.eyebrow}>Academic Support Hub</Text>
          <Text style={styles.title}>Peer Tutoring & Study Groups</Text>
          <Text style={styles.subtitle}>Find trusted peer tutors and build your academic support network.</Text>
          <View style={styles.authCard}>
            <TouchableOpacity style={[styles.toggle, authMode === 'login' && styles.toggleActive]} onPress={() => setAuthMode('login')}><Text style={[styles.toggleText, authMode === 'login' && styles.toggleActiveText]}>Login</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.toggle, authMode === 'register' && styles.toggleActive]} onPress={() => setAuthMode('register')}><Text style={[styles.toggleText, authMode === 'register' && styles.toggleActiveText]}>Register</Text></TouchableOpacity>
            {authMode === 'register' && <TextInput value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} placeholder="Full name" autoCapitalize="words" style={styles.input} />}
            {authMode === 'register' && <TextInput value={form.department} onChangeText={(value) => setForm({ ...form, department: value })} placeholder="School" style={styles.input} />}
            {authMode === 'register' && <TextInput value={form.programOfStudy} onChangeText={(value) => setForm({ ...form, programOfStudy: value })} placeholder="Program of study" style={styles.input} />}
            {authMode === 'register' && <TextInput value={form.studentNumber} onChangeText={(value) => setForm({ ...form, studentNumber: value })} placeholder="Student number" style={styles.input} />}
            <TextInput value={form.email} onChangeText={(value) => setForm({ ...form, email: value })} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <TextInput value={form.password} onChangeText={(value) => setForm({ ...form, password: value })} placeholder="Password" secureTextEntry style={styles.input} />
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity disabled={authLoading} onPress={handleAuth} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{authLoading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View><Text style={styles.eyebrow}>UNZA Academic Support</Text><Text style={styles.title}>Welcome, {user.name.split(' ')[0]}</Text></View>
          <TouchableOpacity onPress={() => setScreen('profile')} style={styles.avatar}><Text style={styles.avatarText}>{user.name.charAt(0)}</Text></TouchableOpacity>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}

        {screen === 'home' && <>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Find your academic support</Text>
            <Text style={styles.heroText}>Discover tutors, book sessions, join study groups, and keep your account up to date.</Text>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search tutors, courses, or departments" style={styles.searchInput} />
            <Text style={styles.filterLabel}>Filter by course</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>
              <TouchableOpacity onPress={() => setTutorCourseFilter('')} style={[styles.filterChip, !tutorCourseFilter && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, !tutorCourseFilter && styles.filterChipTextActive]}>All courses</Text>
              </TouchableOpacity>
              {tutorCourses.map((course) => (
                <TouchableOpacity key={course} onPress={() => setTutorCourseFilter(course)} style={[styles.filterChip, tutorCourseFilter === course && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, tutorCourseFilter === course && styles.filterChipTextActive]}>{course}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.filterLabel}>Filter by school</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>
              <TouchableOpacity onPress={() => setTutorSchoolFilter('')} style={[styles.filterChip, !tutorSchoolFilter && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, !tutorSchoolFilter && styles.filterChipTextActive]}>All schools</Text>
              </TouchableOpacity>
              {tutorSchools.map((school) => (
                <TouchableOpacity key={school} onPress={() => setTutorSchoolFilter(school)} style={[styles.filterChip, tutorSchoolFilter === school && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, tutorSchoolFilter === school && styles.filterChipTextActive]}>{school}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Available tutors</Text><Text style={styles.count}>{filteredTutors.length}</Text></View>
          {loading ? <ActivityIndicator /> : filteredTutors.map((tutor) => (
            <View key={tutor.id} style={styles.card}>
              <View style={styles.cardRow}><View><Text style={styles.name}>{tutor.name}</Text><Text style={styles.meta}>{tutor.courseCode} • {tutor.department}</Text></View><Text style={styles.rating}>★ {tutor.rating}</Text></View>
              <Text style={styles.bio}>{tutor.bio}</Text>
              <TextInput value={selectedTutorId === String(tutor.id) ? bookingDate : ''} onChangeText={setBookingDate} placeholder="Session date" style={styles.input} />
              <TextInput value={bookingNotes} onChangeText={setBookingNotes} placeholder="Session notes" style={styles.input} />
              <TouchableOpacity onPress={() => setSelectedTutorId(String(tutor.id))} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Choose tutor</Text></TouchableOpacity>
              {selectedTutorId === String(tutor.id) && <TouchableOpacity onPress={bookSession} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Book session</Text></TouchableOpacity>}
            </View>
          ))}
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Study groups</Text><Text style={styles.count}>{groups.length}</Text></View>
          {groups.map((group) => <View key={group.id} style={styles.card}><Text style={styles.name}>{group.name}</Text><Text style={styles.meta}>{group.courseCode} • {group.department}</Text><Text style={styles.bio}>{group.members} members • {group.nextSession}</Text></View>)}
          <TouchableOpacity onPress={createGroup} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Create study group</Text></TouchableOpacity>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Messages</Text><Text style={styles.count}>{messages.length}</Text></View>
          {messages.map((message) => <View key={message.id} style={styles.card}><Text style={styles.name}>{message.sender} → {message.receiver}</Text><Text style={styles.bio}>{message.content}</Text></View>)}
          <TextInput value={messageReceiver} onChangeText={setMessageReceiver} placeholder="Recipient" style={styles.input} />
          <TextInput value={messageText} onChangeText={setMessageText} placeholder="Write a message" style={styles.input} multiline />
          <TouchableOpacity onPress={sendMessage} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Send message</Text></TouchableOpacity>
        </>}

        {screen === 'profile' && <View style={styles.authCard}>
          <Text style={styles.title}>My account</Text>
          <TextInput value={profile.name} onChangeText={(value) => setProfile({ ...profile, name: value })} placeholder="Full name" style={styles.input} />
          <TextInput value={profile.department} onChangeText={(value) => setProfile({ ...profile, department: value })} placeholder="School" style={styles.input} />
          <TextInput value={profile.programOfStudy} onChangeText={(value) => setProfile({ ...profile, programOfStudy: value })} placeholder="Program of study" style={styles.input} />
          <TextInput value={profile.studentNumber} onChangeText={(value) => setProfile({ ...profile, studentNumber: value })} placeholder="Student number" style={styles.input} />
          <TouchableOpacity onPress={saveProfile} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Save changes</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('home')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Back to home</Text></TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}><Text style={styles.logoutText}>Log out</Text></TouchableOpacity>
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eff6ff' },
  container: { padding: 24, paddingBottom: 48 },
  authContainer: { padding: 32, paddingBottom: 64 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  eyebrow: { color: '#2563eb', fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#475569', lineHeight: 22, marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  heroCard: { backgroundColor: '#1d4ed8', borderRadius: 22, padding: 22, marginBottom: 22 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  heroText: { color: '#dbeafe', marginBottom: 16 },
  searchInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  filterLabel: { color: '#dbeafe', fontWeight: '700', marginTop: 14, marginBottom: 6 },
  filterOptions: { gap: 8, paddingBottom: 2 },
  filterChip: { backgroundColor: '#dbeafe', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: '#0f172a' },
  filterChipText: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 },
  sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  count: { color: '#2563eb', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: '#0f172a', fontWeight: '700', fontSize: 17 },
  meta: { color: '#475569', fontSize: 12, marginTop: 4 },
  rating: { color: '#92400e', fontWeight: '700', backgroundColor: '#fef3c7', padding: 6, borderRadius: 10 },
  bio: { color: '#475569', marginTop: 10, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, backgroundColor: '#fff' },
  primaryButton: { backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { backgroundColor: '#dbeafe', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { color: '#1d4ed8', fontWeight: '700' },
  authCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12 },
  brandMark: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  brandMarkText: { color: '#fff', fontWeight: '900', fontSize: 20 },
  authContainer: { justifyContent: 'center' },
  toggle: { flexDirection: 'row', justifyContent: 'center', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 16 },
  toggleActive: { backgroundColor: '#fff', borderRadius: 9, paddingHorizontal: 24 },
  toggleText: { color: '#475569', padding: 8, fontWeight: '700' },
  toggleActiveText: { color: '#1d4ed8' },
  error: { color: '#b91c1c', marginTop: 8, lineHeight: 18 },
  logoutButton: { alignItems: 'center', marginTop: 24, padding: 10 },
  logoutText: { color: '#b91c1c', fontWeight: '700' },
});
