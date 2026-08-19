/**
 * Jest 공통 설정.
 *
 * AsyncStorage는 네이티브 모듈이라 테스트 환경에 없다. 공식 목을 등록해 두면
 * persist를 쓰는 스토어를 테스트에서 그대로 import할 수 있다.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
