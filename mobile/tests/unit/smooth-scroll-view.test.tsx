import React, { createRef } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { RefreshControl, ScrollView, Text } from "react-native";
import { SmoothScrollView } from "@/components/ui/SmoothScrollView";

jest.mock("react-native/Libraries/Components/ScrollView/ScrollView", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: React.forwardRef((props: object, ref: unknown) => {
      const host = React.useRef({ scrollTo: jest.fn(), scrollToEnd: jest.fn() });
      React.useImperativeHandle(ref, () => host.current, []);
      return React.createElement(require("react-native").View, props);
    }),
  };
});

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  return {
    useAnimatedRef: () => {
      const ref = React.useRef(null);
      return React.useMemo(() => Object.assign((node: unknown) => { ref.current = node; }, {
        get current() { return ref.current; },
      }), []);
    },
    useSharedValue: (value: number) => React.useRef({ value }).current,
    useScrollOffset: jest.fn(),
  };
});

describe("native scroll position ownership", () => {
  it("keeps the same native scroller when data refreshes after a drag", async () => {
    const ref = createRef<ScrollView>();
    const onScroll = jest.fn();
    const onScrollEndDrag = jest.fn();
    const view = await render(<SmoothScrollView ref={ref} testID="page" onScroll={onScroll} onScrollEndDrag={onScrollEndDrag}><Text>Content</Text></SmoothScrollView>);
    const host = ref.current;
    const event = { nativeEvent: { contentOffset: { x: 0, y: 640 }, contentSize: { width: 360, height: 1800 }, layoutMeasurement: { width: 360, height: 720 } } };
    const scrollTo = jest.spyOn(host!, "scrollTo");
    await fireEvent.scroll(view.getByTestId("page"), event);
    await fireEvent(view.getByTestId("page"), "scrollEndDrag", event);
    await view.rerender(<SmoothScrollView ref={ref} testID="page" onScroll={onScroll} onScrollEndDrag={onScrollEndDrag}><Text>Updated content</Text></SmoothScrollView>);
    expect(ref.current).toBe(host);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(onScroll).toHaveBeenCalledWith(expect.objectContaining({ nativeEvent: expect.objectContaining(event.nativeEvent) }));
    expect(onScrollEndDrag).toHaveBeenCalledWith(event);
    expect(view.getByTestId("page").props.contentOffset).toBeUndefined();
  });

  it("keeps imperative scrolling available to chat and explicitly nested scrollers", async () => {
    const ref = createRef<ScrollView>();
    const view = await render(<SmoothScrollView ref={ref} testID="chat" nestedScrollEnabled><Text>Messages</Text></SmoothScrollView>);
    expect(typeof ref.current?.scrollToEnd).toBe("function");
    expect(view.getByTestId("chat").props.nestedScrollEnabled).toBe(true);
    expect(view.getByTestId("chat").props.removeClippedSubviews).toBe(false);
    expect(view.getByTestId("chat").props.scrollsChildToFocus).toBe(false);
  });

  it("uses native shorter vertical momentum without adding snapping or gesture interception", async () => {
    const view = await render(<SmoothScrollView testID="vertical"><Text>Content</Text></SmoothScrollView>);
    const props = view.getByTestId("vertical").props;
    expect(props.decelerationRate).toBe("fast");
    expect(props.pagingEnabled).toBeUndefined();
    expect(props.snapToInterval).toBeUndefined();
    expect(props.disableScrollViewPanResponder).toBeUndefined();
    expect(props.onTouchMove).toBeUndefined();
    expect(props.keyboardShouldPersistTaps).toBe("handled");
  });

  it("keeps native horizontal carousel physics and explicit nested-scroll behavior", async () => {
    const view = await render(<SmoothScrollView testID="horizontal" horizontal nestedScrollEnabled><Text>Filters</Text></SmoothScrollView>);
    const props = view.getByTestId("horizontal").props;
    expect(props.horizontal).toBe(true);
    expect(props.nestedScrollEnabled).toBe(true);
    expect(props.decelerationRate).toBeUndefined();
    expect(props.keyboardDismissMode).toBeUndefined();
    expect(props.directionalLockEnabled).toBeUndefined();
  });

  it("preserves explicit refresh, keyboard, momentum and touch handlers", async () => {
    const onRefresh=jest.fn(), onTouchStart=jest.fn(), onMomentumScrollEnd=jest.fn();
    const refreshControl=<RefreshControl refreshing onRefresh={onRefresh} />;
    const view=await render(<SmoothScrollView testID="custom" refreshControl={refreshControl} decelerationRate="normal" keyboardDismissMode="none" onTouchStart={onTouchStart} onMomentumScrollEnd={onMomentumScrollEnd}><Text>Custom</Text></SmoothScrollView>);
    const props=view.getByTestId("custom").props;
    expect(props.decelerationRate).toBe("normal");
    expect(props.keyboardDismissMode).toBe("none");
    expect(props.refreshControl).toBe(refreshControl);
    expect(props.refreshControl.props.refreshing).toBe(true);
    expect(props.refreshControl.props.onRefresh).toBe(onRefresh);
    await fireEvent(view.getByTestId("custom"),"touchStart",{});
    await fireEvent(view.getByTestId("custom"),"momentumScrollEnd",{});
    expect(onTouchStart).toHaveBeenCalledTimes(1);
    expect(onMomentumScrollEnd).toHaveBeenCalledTimes(1);
  });
});
