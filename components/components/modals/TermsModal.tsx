// components/modals/TermsModal.tsx - 박찬영 정보로 최종 수정
import React from 'react';
import {
  Modal,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DefaultText from '../../DefaultText';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

const TermsModal: React.FC<TermsModalProps> = ({ visible, onClose, type }) => {
  const isTerms = type === 'terms';
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <DefaultText style={styles.title}>
            {isTerms ? '서비스 이용약관' : '개인정보 처리방침'}
          </DefaultText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* 내용 */}
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={true}
          bounces={true}
          contentContainerStyle={styles.contentContainer}
        >
          <DefaultText style={styles.contentText}>
            {isTerms ? TERMS_CONTENT : PRIVACY_CONTENT}
          </DefaultText>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// 수정된 이용약관 내용
const TERMS_CONTENT = `제1조 (목적)
이 약관은 박찬영(이하 "서비스 제공자")이 제공하는 부부 감정 기록 및 분석 서비스 "토닥토닥"(이하 "서비스")의 이용과 관련하여 서비스 제공자와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 서비스 제공자가 제공하는 부부 간 감정 기록, 분석, 상담 보조 서비스를 의미합니다.
2. "회원"이란 이 약관에 동의하고 서비스 제공자와 서비스 이용계약을 체결한 개인을 말합니다.
3. "부부"란 법적 혼인관계 또는 사실혼 관계에 있는 2인을 의미합니다.

제3조 (서비스 제공자 정보)
1. 서비스명: 토닥토닥
2. 운영자: 박찬영 (개인)
3. 연락처: dogadogados86@gmail.com
4. 서비스 형태: 온라인 모바일 애플리케이션

제4조 (약관의 효력 및 변경)
1. 이 약관은 서비스를 이용하고자 하는 모든 회원에게 그 효력이 발생합니다.
2. 서비스 제공자는 필요한 경우 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지를 통해 공시합니다.

제5조 (서비스의 제공)
1. 서비스 제공자는 다음과 같은 서비스를 제공합니다:
   - 개인 및 부부 감정 기록 기능
   - AI 기반 감정 분석 및 리포트
   - 부부 관계 개선을 위한 정보 제공
   - 기타 서비스 제공자가 정하는 서비스

제6조 (회원가입)
1. 회원가입은 다음 방법으로 가능합니다:
   - Google 계정을 통한 소셜 로그인
   - 이메일과 비밀번호를 통한 직접 가입
2. 만 19세 미만의 미성년자는 서비스를 이용할 수 없습니다.
3. 서비스 제공자는 다음의 경우 회원가입을 승낙하지 않을 수 있습니다:
   - 타인의 정보를 도용한 경우
   - 서비스 운영을 고의로 방해한 이력이 있는 경우

제7조 (회원탈퇴 및 자격 상실)
1. 회원은 언제든지 서비스 탈퇴를 요청할 수 있습니다.
2. 회원 탈퇴 시 모든 개인정보는 즉시 삭제되며, 복구할 수 없습니다.

제8조 (개인정보보호)
회원의 개인정보보호에 관한 사항은 별도의 개인정보 처리방침에 따릅니다.

제9조 (서비스 이용제한)
1. 회원은 다음 행위를 하여서는 안 됩니다:
   - 타인의 개인정보를 부정하게 이용하는 행위
   - 서비스의 안정적 운영을 방해하는 행위
   - 공공질서 및 미풍양속에 반하는 행위

제10조 (면책조항)
1. 본 서비스는 상담 보조 목적이며, 의료행위를 대체할 수 없습니다.
2. 서비스 제공자는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.

제11조 (준거법 및 관할법원)
이 약관에 관하여 분쟁이 생긴 경우, 대한민국 법을 준거법으로 하며, 서울중앙지방법원을 관할 법원으로 합니다.

부칙
이 약관은 2025년 1월 15일부터 시행됩니다.`;

// 수정된 개인정보처리방침 내용
const PRIVACY_CONTENT = `개인정보 처리방침

박찬영(이하 "개인정보처리자")은 개인정보보호법 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.

■ 개인정보처리자 정보
- 개인정보처리자: 박찬영 (개인)
- 서비스명: 토닥토닥
- 연락처: dogadogados86@gmail.com
- 서비스 형태: 온라인 서비스

제1조 (개인정보의 처리목적)
개인정보처리자는 다음의 목적을 위하여 개인정보를 처리합니다:

1. 회원 가입 및 관리
   - 회원 식별, 서비스 이용의사 확인, 연령 확인 등

2. 서비스 제공
   - 부부 감정 기록 및 분석 서비스 제공
   - AI 기반 관계 분석 리포트 제공
   - 맞춤형 콘텐츠 추천

제2조 (개인정보의 처리 및 보유기간)
1. 회원 가입 및 관리: 회원 탈퇴 시까지
2. 감정 기록 데이터: 회원 탈퇴 후 즉시 삭제
3. 서비스 이용 기록: 3개월 (통계 목적)

제3조 (처리하는 개인정보 항목)
1. 필수항목
   - Google 계정 정보 (이메일, 이름, 프로필 사진)
   - 서비스 이용 기록
   - 감정 기록 데이터
   - 부부 연결 정보

2. 선택항목
   - 애착 유형 검사 결과
   - 심리 검사 결과

제4조 (개인정보의 제3자 제공)
개인정보처리자는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다.

다만, 다음의 경우에는 예외로 합니다:
1. Claude API (Anthropic Inc.): AI 분석 서비스 제공 목적
   - 제공항목: 감정 기록 데이터 (개인 식별 정보 제외)
   - 보유기간: 분석 완료 후 즉시 삭제

제5조 (개인정보처리 위탁)
개인정보처리자는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:

1. Google Firebase (Google LLC)
   - 위탁업무: 사용자 인증, 데이터 저장
   - 위탁기간: 서비스 제공 기간

제6조 (정보주체의 권리·의무 및 행사방법)
정보주체는 개인정보처리자에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:

1. 개인정보 처리현황 통지 요구
2. 개인정보 열람 요구
3. 개인정보 정정·삭제 요구
4. 개인정보 처리정지 요구

권리 행사는 이메일(dogadogados86@gmail.com)을 통해 할 수 있습니다.

제7조 (개인정보의 파기)
개인정보처리자는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.

제8조 (개인정보의 안전성 확보조치)
개인정보처리자는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:

1. 관리적 조치: 개인정보 취급직원의 최소화 및 교육
2. 기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 암호화
3. 물리적 조치: 접근통제

제9조 (개인정보보호책임자)
- 개인정보보호책임자: 박찬영
- 연락처: dogadogados86@gmail.com

제10조 (개인정보 처리방침 변경)
이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.

시행일자: 2025년 1월 15일`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'GmarketSansTTFMedium',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    fontFamily: 'GmarketSansTTFLight',
  },
});

export default TermsModal;