import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * 로컬 영속 저장소 (zustand persist용).
 *
 * Phase 1: AsyncStorage(로컬) 기반.
 * Phase 2: Supabase 동기화 계층이 이 위에 추가된다 (docs/architecture.md 참고).
 * 저장소 자체를 교체할 수 있게 이 모듈을 통해서만 접근한다.
 */
export const persistStorage = createJSONStorage(() => AsyncStorage);
