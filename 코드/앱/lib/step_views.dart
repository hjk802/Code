// 스캔하기 탭의 단계별 UI 컴포넌트
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:async';
import 'package:mobile_scanner/mobile_scanner.dart';

class TokenScannerPage extends StatelessWidget {
  const TokenScannerPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('기기 스캔')),
      body: MobileScanner(
        controller: MobileScannerController(
          detectionSpeed: DetectionSpeed.noDuplicates,
        ),
        onDetect: (capture) {
          final List<Barcode> barcodes = capture.barcodes;
          if (barcodes.isNotEmpty) {
            final String? code = barcodes.first.rawValue;
            if (code != null) {
              Navigator.pop(context, code);
            }
          }
        },
      ),
    );
  }
}

class RejectStepView extends StatelessWidget {
  final String reason;
  final VoidCallback onFinish;
  final double points;

  const RejectStepView({
    super.key,
    required this.reason,
    required this.onFinish,
    required this.points,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.all(40),
        decoration: BoxDecoration(
          color: Colors.red[900],
          borderRadius: BorderRadius.circular(40),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Icon(
              Icons.warning_amber_rounded,
              color: Colors.white,
              size: 80,
            ),
            const SizedBox(height: 20),
            const Text(
              '반입 거절됨',
              style: TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              '사유: $reason',
              style: const TextStyle(color: Colors.white70, fontSize: 18),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 30),
            Text(
              '$points 포인트',
              style: const TextStyle(color: Colors.yellowAccent, fontSize: 36),
            ),
            const Text(
              '잘못된 배출로 인해 포인트가 차감되었습니다.',
              style: TextStyle(color: Colors.white54, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),
            ElevatedButton(onPressed: onFinish, child: const Text('확인')),
          ],
        ),
      ),
    );
  }
}

class ReadyStepView extends StatefulWidget {
  final Function(int logNum) onStart;
  const ReadyStepView({super.key, required this.onStart});

  @override
  State<ReadyStepView> createState() => _ReadyStepViewState();
}

class _ReadyStepViewState extends State<ReadyStepView> {
  final TextEditingController _tokenController = TextEditingController();
  Future<void> _onScanPressed() async {
    final String? scannedToken = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (context) => const TokenScannerPage()),
    );

    if (scannedToken != null && scannedToken.isNotEmpty) {
      setState(() {
        _tokenController.text = scannedToken;
      });
      onStartWithToken(scannedToken);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 20),
        const Text(
          '기기를 연결해 주세요',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F462C),
          ),
        ),
        const SizedBox(height: 30),

        InkWell(
          onTap: _onScanPressed,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF0F462C).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF0F462C), width: 1.5),
            ),
            child: const Column(
              children: [
                Icon(Icons.qr_code_scanner, size: 40, color: Color(0xFF0F462C)),
                SizedBox(height: 10),
                Text(
                  'QR 코드 스캔하기',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F462C),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 25),
        const Text(
          "또는 직접 입력",
          style: TextStyle(color: Colors.grey, fontSize: 13),
        ),
        const SizedBox(height: 15),

        TextField(
          controller: _tokenController,
          decoration: InputDecoration(
            hintText: '토큰 번호 직접 입력',
            prefixIcon: const Icon(Icons.edit, size: 20),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(20)),
            filled: true,
            fillColor: Colors.grey[100],
          ),
        ),

        const SizedBox(height: 30),

        ElevatedButton(
          onPressed: () {
            final String enteredToken = _tokenController.text.trim();
            if (enteredToken.isNotEmpty) {
              onStartWithToken(enteredToken);
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('토큰을 입력하거나 QR을 스캔해주세요!')),
              );
            }
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0F462C),
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 60),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
          ),
          child: const Text(
            '수동 입력 완료',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  Future<void> onStartWithToken(String token) async {
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'user-scan',
        body: {'token': token},
      );
      if (response.status == 200 && response.data != null) {
        final int? logNum = response.data['log_num'];

        if (logNum != null) {
          debugPrint('스캔 성공: log_num = $logNum');
          widget.onStart(logNum);
        } else {
          throw Exception('서버 응답에 로그 번호가 포함되지 않았습니다.');
        }
      } else {
        throw Exception('서버 응답 에러: ${response.status}');
      }
    } on FunctionException catch (fe) {
      debugPrint('Edge Function 에러: ${fe.status} - ${fe.details}');
      _showErrorSnackBar('기기 연결에 실패했습니다. 다시 시도해주세요.');
    } catch (e) {
      debugPrint('알 수 없는 에러 발생: $e');
      _showErrorSnackBar('네트워크 오류가 발생했습니다.');
    }
  }

  void _showErrorSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.redAccent,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

class ProcessingStepView extends StatefulWidget {
  final int logNum;
  final Function(double points, double carbon, {String? reason}) onFinished;

  const ProcessingStepView({
    super.key,
    required this.logNum,
    required this.onFinished,
  });

  @override
  State<ProcessingStepView> createState() => _ProcessingStepViewState();
}

class _ProcessingStepViewState extends State<ProcessingStepView> {
  bool _isHandled = false;
  StreamSubscription? _subscription;
  int _timeLeft = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
    _startMonitoring();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_timeLeft > 0) {
        setState(() => _timeLeft--);
      } else {
        _timer?.cancel();
        widget.onFinished(0.0, 0.0);
      }
    });
  }

  Timer? _periodicTimer;

  void _startMonitoring() {
    _subscription = Supabase.instance.client
        .from('waste_logs')
        .stream(primaryKey: ['num'])
        .eq('num', widget.logNum)
        .listen((data) {
          if (_isHandled || data.isEmpty) return;
          final log = data.first;
          if (log['trash_type'] != null &&
              (log['point_earned'] != null || log['trash_type'] == 'reject')) {
            _handleResult(log);
          }
        });

    _periodicTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      if (_isHandled) {
        timer.cancel();
        return;
      }

      try {
        final response = await Supabase.instance.client
            .from('waste_logs')
            .select()
            .eq('num', widget.logNum)
            .maybeSingle();

        if (response != null) {
          final String? trashType = response['trash_type'];
          final dynamic points = response['point_earned'];

          if (trashType == 'reject' || points != null) {
            debugPrint('[보험 작동] 스트림 대신 폴링이 데이터를 찾아냈습니다!');
            _handleResult(response);
            timer.cancel();
          }
        }
      } catch (e) {
        debugPrint('폴링 조회 실패: $e');
      }
    });
  }

  @override
  void dispose() {
    _periodicTimer?.cancel();
    _subscription?.cancel();
    super.dispose();
  }

  void _handleResult(Map<String, dynamic> log) {
    if (_isHandled) return;

    _isHandled = true;
    _timer?.cancel();
    _subscription?.cancel();

    final String? trashType = log['trash_type'];
    final String? reason = log['rejection_reason'];
    final dynamic pointsRaw = log['point_earned'];
    final dynamic carbonRaw = log['carbon_reduction_gram'];

    if (trashType == 'reject') {
      widget.onFinished(-10.0, 0.0, reason: reason ?? "사유 미상");
    } else {
      double p = (pointsRaw as num? ?? 0.0).toDouble();
      double c = (carbonRaw as num? ?? 0.0).toDouble();
      widget.onFinished(p, c);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: const Color(0xFF0F462C),
        borderRadius: BorderRadius.circular(40),
      ),
      child: Column(
        children: [
          const Icon(Icons.check_circle, color: Color(0xFF00FF9C), size: 60),
          const SizedBox(height: 20),
          const Text(
            '인증 성공!',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            '기기에 쓰레기를 투입해 주세요, 투입했으면 기다려 주세요.',
            style: TextStyle(color: Colors.white70, fontSize: 16),
          ),
          const SizedBox(height: 40),
          Stack(
            alignment: Alignment.center,
            children: [
              const SizedBox(
                width: 150,
                height: 150,
                child: CircularProgressIndicator(
                  color: Color(0xFF00FF9C),
                  strokeWidth: 8,
                ),
              ),
              Text(
                '$_timeLeft초',
                style: const TextStyle(
                  color: Color(0xFF00FF9C),
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 30),
          if (_timeLeft <= 40)
            SizedBox(
              width: 200,
              height: 50,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pushReplacementNamed(context, '/home');
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                child: const Text('홈으로', style: TextStyle(fontSize: 18)),
              ),
            ),
        ],
      ),
    );
  }
}

class SuccessStepView extends StatelessWidget {
  final double points;
  final double carbon;
  final VoidCallback onFinish;

  const SuccessStepView({
    super.key,
    required this.points,
    required this.carbon,
    required this.onFinish,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(40),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.stars, color: Color(0xFFFFD700), size: 80),
          const SizedBox(height: 20),
          const Text(
            '투입 성공!',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F462C),
            ),
          ),
          const SizedBox(height: 30),
          _buildInfoRow('획득 포인트', '$points P', const Color(0xFF0F462C)),

          const Divider(height: 30),
          _buildInfoRow(
            '탄소 저감량',
            '${carbon.toStringAsFixed(2)} g',
            Colors.blueGrey,
          ),

          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: onFinish,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F462C),
              minimumSize: const Size(double.infinity, 65),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              elevation: 0,
            ),
            child: const Text(
              '확인',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 16,
            color: Colors.grey,
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            color: valueColor,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}
