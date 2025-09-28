import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'offlineQueue:v1';

export async function enqueue(payload: any) {
  const raw = await AsyncStorage.getItem(KEY);
  const arr = raw ? JSON.parse(raw) : [];
  arr.push({ id: Date.now() + ':' + Math.random(), payload });
  await AsyncStorage.setItem(KEY, JSON.stringify(arr));
}

export async function flush(sender: (payload:any)=>Promise<void>) {
  const raw = await AsyncStorage.getItem(KEY);
  const arr: {id:string; payload:any}[] = raw ? JSON.parse(raw) : [];
  const remain: typeof arr = [];
  for (const item of arr) {
    try {
      await sender(item.payload);
    } catch (e) {
      remain.push(item);
    }
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(remain));
}

export async function clearQueue() {
  await AsyncStorage.removeItem(KEY);
}


