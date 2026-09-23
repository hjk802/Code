// 홈 화면 전체, 스캔하기, 내 정보 보기 탭
import 'package:flutter/material.dart';
import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:smartecobin/recycle_mapping.dart';
import 'package:smartecobin/data_service.dart';
import 'package:smartecobin/wigets_screen.dart';

class RecycleMainPage extends StatefulWidget {
  const RecycleMainPage({super.key});

  @override
  State<RecycleMainPage> createState() => _RecycleMainPageState();
}

class _RecycleMainPageState extends State<RecycleMainPage> {
  Widget _buildTabButton(String label, AppStep step) {
    final bool isSelected =
        _currentStep == step ||
        (_currentStep == AppStep.processing && step == AppStep.ready) ||
        (_currentStep == AppStep.success && step == AppStep.ready);

    return GestureDetector(
      onTap: () {
        setState(() {
          _currentStep = step;
          if (step == AppStep.myPage) {
            _initLoad();
          }
        });
      },
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 16,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: isSelected ? const Color(0xFF0F462C) : Colors.grey,
            ),
          ),
          if (isSelected)
            Container(
              margin: const EdgeInsets.only(top: 4),
              height: 2,
              width: 20,
              color: const Color(0xFF0F462C),
            ),
        ],
      ),
    );
  }

  MyUserInfo? _myInfo;
  AppStep _currentStep = AppStep.ready;
  final int _timeLeft = 60;
  Timer? _timer;
  List<WasteLog> _logs = [];
  bool _hasMore = true;
  bool _isInitialLoading = true;
  bool _isMoreLoading = false;
  int _currentLogNum = 0;

  double _earnedPoints = 0.0;
  double _earnedCarbon = 0.0;
  String _rejectReason = "";

  void _onFinishProcessing(double points, double carbon, {String? reason}) {
    if (points < 0) {
      setState(() {
        _earnedPoints = points;
        _currentStep = AppStep.fail;
        _rejectReason = reason ?? "";
      });
      return;
    }
    if (points == 0.0) {
      setState(() {
        _currentStep = AppStep.ready;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('투입 시간이 초과되어 취소되었습니다.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    setState(() {
      _earnedPoints = points;
      _earnedCarbon = carbon;
      _currentStep = AppStep.success;
    });
  }

  @override
  void initState() {
    super.initState();
    _initLoad();
  }

  Future<List<WasteLog>> _fetchUntilDateComplete(String? lastDate) async {
    const int targetLimit = 10;
    List<WasteLog> allFetched = [];

    final initialLogs = await DataService.getLogs(
      lastDate: lastDate,
      limit: targetLimit,
    );
    if (initialLogs.isEmpty) return [];

    allFetched.addAll(initialLogs);

    if (initialLogs.length == targetLimit) {
      String lastDateString = initialLogs.last.dateString;
      String? currentCursor = initialLogs.last.createdAt.toIso8601String();

      bool extraCheck = true;
      while (extraCheck) {
        final extraLogs = await DataService.getLogs(
          lastDate: currentCursor,
          limit: 10,
        );

        if (extraLogs.isEmpty) break;

        bool foundDifferentDate = false;
        for (var log in extraLogs) {
          if (log.dateString == lastDateString) {
            allFetched.add(log);
          } else {
            foundDifferentDate = true;
            break;
          }
        }

        if (foundDifferentDate || extraLogs.length < 10) {
          extraCheck = false;
        } else {
          currentCursor = extraLogs.last.createdAt.toIso8601String();
        }
      }
    }

    return allFetched;
  }

  Future<void> _initLoad() async {
    setState(() => _isInitialLoading = true);
    try {
      final profile = await DataService.fetchMyProfile();
      final firstLogs = await _fetchUntilDateComplete(null);

      setState(() {
        _myInfo = profile;
        _logs = firstLogs;
        _isInitialLoading = false;
        _hasMore = firstLogs.isNotEmpty;
      });
    } catch (e) {
      setState(() => _isInitialLoading = false);
    }
  }

  Future<void> _loadMore() async {
    if (_isMoreLoading || !_hasMore) return;
    setState(() => _isMoreLoading = true);

    try {
      final String lastTime = _logs.last.createdAt.toIso8601String();
      final nextLogs = await _fetchUntilDateComplete(lastTime);

      setState(() {
        if (nextLogs.isEmpty) {
          _hasMore = false;
        } else {
          _logs.addAll(nextLogs);
        }
        _isMoreLoading = false;
      });
    } catch (e) {
      setState(() => _isMoreLoading = false);
    }
  }

  Future<void> _signOut() async {
    try {
      await Supabase.instance.client.auth.signOut();
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('에러: $e')));
    }
  }

  Future<void> _deleteAccount() async {
    bool confirm = await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('회원 탈퇴'),
        content: const Text('정말 탈퇴하시겠습니까? 모든 포인트와 기록이 삭제되며 복구할 수 없습니다.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('탈퇴', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await Supabase.instance.client.rpc('delete_user_self');
      await Supabase.instance.client.auth.signOut();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.')),
      );
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('탈퇴 중 오류가 발생했습니다: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _editName() async {
    if (_myInfo == null) return;
    final TextEditingController nameController = TextEditingController(
      text: _myInfo!.name,
    );
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          '이름 수정',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            hintText: "새 이름을 입력하세요",
            focusedBorder: UnderlineInputBorder(
              borderSide: BorderSide(color: Color(0xFF0F462C)),
            ),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () async {
              final newName = nameController.text.trim();
              final currentContext = context;

              if (newName.isNotEmpty && newName != _myInfo!.name) {
                try {
                  await DataService.updateProfileName(newName);
                  if (!currentContext.mounted) return;

                  setState(() {
                    _myInfo = MyUserInfo(
                      name: newName,
                      mail: _myInfo!.mail,
                      points: _myInfo!.points,
                      carbon: _myInfo!.carbon,
                      rejectCount: _myInfo!.rejectCount,
                    );
                  });

                  if (context.mounted) Navigator.pop(context);
                  ScaffoldMessenger.of(
                    currentContext,
                  ).showSnackBar(const SnackBar(content: Text('이름이 변경되었습니다.')));
                } catch (e) {
                  if (!currentContext.mounted) return;
                  ScaffoldMessenger.of(
                    currentContext,
                  ).showSnackBar(const SnackBar(content: Text('이름 수정 오류')));
                }
              } else {
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F462C),
            ),
            child: const Text('저장', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _handleStartProcessing(int logNum) {
    setState(() {
      _currentLogNum = logNum;
      _currentStep = AppStep.processing;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            if (_currentStep == AppStep.ready || _currentStep == AppStep.myPage)
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    _buildTabButton("스캔하기", AppStep.ready),
                    const SizedBox(width: 20),
                    _buildTabButton("내 정보 보기", AppStep.myPage),
                  ],
                ),
              ),

            Expanded(
              child: WigetsScreen(
                currentStep: _currentStep,
                myInfo: _myInfo,
                timeLeft: _timeLeft,
                isInitialLoading: _isInitialLoading,
                hasMore: _hasMore,
                isMoreLoading: _isMoreLoading,
                logs: _logs,
                earnedPoints: _earnedPoints,
                earnedCarbon: _earnedCarbon,
                rejectionReason: _rejectReason,
                onFinish: _onFinishProcessing,
                startProcessing: _handleStartProcessing,

                signOut: _signOut,
                deleteAccount: _deleteAccount,
                editName: _editName,
                loadMore: _loadMore,

                goToMyPage: () {
                  setState(() {
                    _currentStep = AppStep.myPage;
                  });
                  _initLoad();
                },
                logNum: _currentLogNum,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
