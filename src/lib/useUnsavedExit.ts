import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * 저장하지 않은 내용이 있을 때 화면을 나가려 하면 한 번 물어본다.
 *
 * 막아야 하는 나가기는 세 가지다.
 * - 화면 안의 뒤로가기 버튼 / router.back()  → 네비게이션 beforeRemove
 * - 안드로이드 뒤로가기 버튼·제스처(네이티브) → BackHandler
 * - **브라우저 뒤로가기** → 아래 히스토리 방식
 *
 * 세 번째가 핵심이다. 갤럭시에서 이 앱은 홈 화면에 설치한 PWA로 도는데, 폰의 뒤로가기
 * 제스처가 결국 브라우저 뒤로가기로 들어온다. 그런데 브라우저 뒤로가기는 beforeRemove를
 * 발생시키지 않아서, 확인창 없이 화면이 그냥 닫히고 고치던 내용이 사라졌다.
 *
 * 그래서 가드가 켜지는 동안 히스토리에 표식(sentinel)을 하나 올려 둔다. 뒤로가기를 누르면
 * 그 표식이 대신 소비되고, 우리는 제자리에 표식을 다시 올린 뒤 확인창을 띄운다.
 * 실제로 나갈 때만 표식과 현재 화면을 함께 건너뛴다.
 */

const SENTINEL = { __dlogExitGuard: true };

interface UnsavedExit {
  /** 확인창을 띄워야 하는지 */
  pending: boolean;
  /** 저장하지 않고 나간다 */
  confirm: () => void;
  /** 이 화면에 머문다 */
  cancel: () => void;
  /**
   * 저장 후 이동처럼, 확인 없이 곧바로 나가야 할 때 쓴다.
   * 히스토리에 올려 둔 표식을 먼저 걷어내고 이동하므로, 뒤로가기가 한 번 헛돌지 않는다.
   */
  leaveWithoutAsking: (go: () => void) => void;
}

export function useUnsavedExit(hasUnsaved: boolean): UnsavedExit {
  const navigation = useNavigation();
  const [pendingAction, setPendingAction] = useState<unknown>(null);
  const [pendingBack, setPendingBack] = useState(false);

  // 리스너 안에서 최신 값을 읽어야 해서 ref로 둔다 (리스너를 매번 다시 붙이지 않으려고)
  const guardRef = useRef(hasUnsaved);
  useEffect(() => {
    guardRef.current = hasUnsaved;
  }, [hasUnsaved]);

  /** 히스토리에 표식을 올려 둔 상태인지 */
  const sentinelRef = useRef(false);

  // 1) 화면 안 뒤로가기
  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'beforeRemove' as never,
      ((e: { preventDefault: () => void; data: { action: unknown } }) => {
        if (!guardRef.current) return;
        e.preventDefault();
        setPendingAction(e.data.action);
      }) as never,
    );
    return unsubscribe;
  }, [navigation]);

  // 2) 안드로이드 뒤로가기 (네이티브 빌드)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!guardRef.current) return false;
      setPendingBack(true);
      return true; // 기본 뒤로가기를 막고 확인창을 띄운다
    });
    return () => sub.remove();
  }, []);

  // 3) 브라우저 뒤로가기 (PWA에서 폰 뒤로가기가 여기로 들어온다)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!hasUnsaved) return;

    const pushSentinel = () => {
      window.history.pushState(SENTINEL, '', window.location.href);
      sentinelRef.current = true;
    };

    const onPop = () => {
      sentinelRef.current = false; // 방금 소비됐다
      if (!guardRef.current) return; // 이미 나가기로 결정한 상태면 그대로 보낸다
      pushSentinel(); // 제자리로 되돌리고
      setPendingBack(true); // 물어본다
    };

    pushSentinel();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, [hasUnsaved]);

  const cancel = useCallback(() => {
    setPendingAction(null);
    setPendingBack(false);
  }, []);

  const confirm = useCallback(() => {
    const action = pendingAction;
    guardRef.current = false;
    setPendingAction(null);
    setPendingBack(false);

    // 표식이 올라가 있으면 표식과 현재 화면을 함께 건너뛴다.
    // (어느 경로로 들어왔든 동일하게 처리해야 뒤로가기가 한 번 헛돌지 않는다)
    if (sentinelRef.current && typeof window !== 'undefined' && window.history.length > 2) {
      sentinelRef.current = false;
      window.history.go(-2);
      return;
    }

    if (action) {
      (navigation as unknown as { dispatch: (a: unknown) => void }).dispatch(action);
    } else {
      (navigation as unknown as { goBack: () => void }).goBack();
    }
  }, [navigation, pendingAction]);

  const leaveWithoutAsking = useCallback((go: () => void) => {
    guardRef.current = false;
    setPendingAction(null);
    setPendingBack(false);

    // 표식을 남겨 두면 이동한 뒤 뒤로가기가 한 번 헛돈다. 먼저 걷어내고 이동한다.
    if (sentinelRef.current && typeof window !== 'undefined') {
      sentinelRef.current = false;
      const run = () => {
        window.removeEventListener('popstate', run);
        go();
      };
      window.addEventListener('popstate', run);
      window.history.go(-1);
      return;
    }

    go();
  }, []);

  return { pending: pendingAction !== null || pendingBack, confirm, cancel, leaveWithoutAsking };
}
