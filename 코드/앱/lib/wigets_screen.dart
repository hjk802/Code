// 현재 단계에 따라 알맞은 화면을 전환하여 보여주는 라우팅/컨트롤러
import 'package:flutter/material.dart';
import 'dart:async';
import 'package:smartecobin/recycle_mapping.dart';
import 'package:smartecobin/my_page_view.dart';
import 'package:smartecobin/step_views.dart';

class WigetsScreen extends StatelessWidget {
  final AppStep currentStep;
  final MyUserInfo? myInfo;
  final double earnedPoints;
  final double earnedCarbon;
  final Function(int logNum) startProcessing;
  final Function(double points, double carbon, {String? reason}) onFinish;

  final int timeLeft;
  final int logNum;
  final bool isInitialLoading;
  final bool hasMore;
  final bool isMoreLoading;
  final String rejectionReason;
  final Future<void> Function() signOut;
  final Future<void> Function() deleteAccount;
  final Future<void> Function() editName;
  final Future<void> Function() loadMore;
  final VoidCallback goToMyPage;
  final List<WasteLog> logs;

  const WigetsScreen({
    super.key,
    required this.myInfo,
    required this.startProcessing,
    required this.timeLeft,
    required this.isInitialLoading,
    required this.signOut,
    required this.deleteAccount,
    required this.editName,
    required this.logs,
    required this.hasMore,
    required this.isMoreLoading,
    required this.loadMore,
    required this.currentStep,
    required this.onFinish,
    required this.logNum,
    required this.goToMyPage,
    required this.earnedPoints,
    required this.earnedCarbon,
    required this.rejectionReason,
  });

  @override
  Widget build(BuildContext context) {
    switch (currentStep) {
      case AppStep.ready:
        return ReadyStepView(onStart: startProcessing);
      case AppStep.processing:
        return ProcessingStepView(logNum: logNum, onFinished: onFinish);
      case AppStep.success:
        return SuccessStepView(
          points: earnedPoints,
          carbon: earnedCarbon,
          onFinish: goToMyPage,
        );
      case AppStep.fail:
        return RejectStepView(
          reason: rejectionReason.isEmpty
              ? "알 수 없는 오류가 발생했습니다."
              : rejectionReason,
          onFinish: goToMyPage,
          points: earnedPoints,
        );
      case AppStep.myPage:
        if (myInfo == null) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return MyPageView(
          info: myInfo!,
          logs: logs,
          hasMore: hasMore,
          isMoreLoading: isMoreLoading,
          loadMore: loadMore,
          signOut: signOut,
          deleteAccount: deleteAccount,
          editName: editName,
        );
    }
  }
}
