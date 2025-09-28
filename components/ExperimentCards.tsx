import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import DefaultText from './DefaultText';

export interface Experiment {
  id: string;
  if: string;
  then: string;
  target: string; // 목표 지표 변화
  done?: boolean;
}

export default function ExperimentCards({ experiments, onToggle }:{
  experiments: Experiment[];
  onToggle?: (id:string, done:boolean)=>void;
}) {
  return (
    <View style={{ gap: 10 }}>
      {experiments.map(exp => (
        <TouchableOpacity
          key={exp.id}
          style={[styles.card, exp.done && styles.cardDone]}
          onPress={()=> onToggle?.(exp.id, !exp.done)}
          activeOpacity={0.8}
        >
          <DefaultText style={styles.title}>If {exp.if}</DefaultText>
          <DefaultText style={styles.desc}>Then {exp.then}</DefaultText>
          <DefaultText style={styles.target}>Target: {exp.target}</DefaultText>
          <DefaultText style={[styles.status, exp.done? styles.done: styles.todo]}>
            {exp.done? '완료' : '실행해보기'}
          </DefaultText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card:{ backgroundColor:'#FFF', borderRadius:12, padding:16, borderWidth:1, borderColor:'#E8ECEF' },
  cardDone:{ backgroundColor:'#F0FAF0', borderColor:'#CDEAC0' },
  title:{ fontWeight:'700', marginBottom:4 },
  desc:{ color:'#333', marginBottom:4 },
  target:{ color:'#555', marginBottom:8 },
  status:{ fontSize:12, fontWeight:'700' },
  todo:{ color:'#2376D3' },
  done:{ color:'#2E7D32' }
});


