// 내 정보 보기 탭 UI
import 'package:flutter/material.dart';
import 'package:smartecobin/recycle_mapping.dart';
import 'package:smartecobin/common_widgets.dart';

class MyPageView extends StatelessWidget {
  final MyUserInfo info;
  final List<WasteLog> logs;
  final bool hasMore;
  final bool isMoreLoading;
  final Future<void> Function() loadMore;
  final Future<void> Function() signOut;
  final Future<void> Function() deleteAccount;
  final Future<void> Function() editName;

  const MyPageView({
    super.key,
    required this.info,
    required this.logs,
    required this.hasMore,
    required this.isMoreLoading,
    required this.loadMore,
    required this.signOut,
    required this.deleteAccount,
    required this.editName,
  });

  @override
  Widget build(BuildContext context) {
    Map<String, List<WasteLog>> groupedLogs = {};
    for (var log in logs) {
      if (groupedLogs[log.dateString] == null) groupedLogs[log.dateString] = [];
      groupedLogs[log.dateString]!.add(log);
    }
    final sortedDates = groupedLogs.keys.toList();

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            children: [
              _buildTopMenu(),
              _buildProfileCard(info),
              const SizedBox(height: 30),
            ],
          ),
        ),

        SliverList(
          delegate: SliverChildBuilderDelegate((context, index) {
            final date = sortedDates[index];
            final dailyLogs = groupedLogs[date]!;
            final double dailyPointsSum = dailyLogs.fold(
              0.0,
              (sum, item) => sum + item.points,
            );

            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(15),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: ExpansionTile(
                title: Text(
                  _formatDate(date),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: Text(
                  "총 ${dailyPointsSum.toInt()} P 적립 · ${dailyLogs.length}건",
                ),
                children: dailyLogs.map((log) => _buildLogCard(log)).toList(),
              ),
            );
          }, childCount: sortedDates.length),
        ),

        if (hasMore) SliverToBoxAdapter(child: _buildLoadMoreButton()),
      ],
    );
  }

  Widget _buildTopMenu() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          TextButton(
            onPressed: deleteAccount,
            child: const Text(
              '회원탈퇴',
              style: TextStyle(color: Colors.redAccent, fontSize: 12),
            ),
          ),
          const Text(' | ', style: TextStyle(color: Colors.grey, fontSize: 12)),
          TextButton(
            onPressed: signOut,
            child: const Text(
              '로그아웃',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ),
          const Text(' | ', style: TextStyle(color: Colors.grey, fontSize: 12)),
          TextButton(
            onPressed: editName,
            child: const Text(
              '이름변경',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadMoreButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: TextButton(
        onPressed: isMoreLoading ? null : loadMore,
        child: isMoreLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Text(
                "이전 날짜 기록 더 보기",
                style: TextStyle(
                  color: Colors.grey,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ),
    );
  }

  Widget _buildLogCard(WasteLog log) {
    final bool isRejected = log.points < 0;
    final Color pointColor = isRejected
        ? Colors.redAccent
        : const Color(0xFF0F462C);
    final String pointText = isRejected
        ? "${log.points.toInt()}P"
        : "+${log.points.toInt()}P\n${log.carbon.toInt()}g CO₂";

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: pointColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isRejected ? Icons.report_problem : Icons.recycling,
              color: pointColor,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  log.trashType,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (isRejected && log.rejectionReason!.isNotEmpty)
                  Text(
                    log.rejectionReason!,
                    style: TextStyle(color: Colors.red[300], fontSize: 12),
                  ),
                Text(
                  "${log.createdAt.hour.toString().padLeft(2, '0')}:${log.createdAt.minute.toString().padLeft(2, '0')}",
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),

          Text(
            pointText,
            textAlign: TextAlign.end,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: pointColor,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    final now = DateTime.now().toString().split(' ')[0];
    if (dateStr == now) return "오늘";

    final yesterday = DateTime.now()
        .subtract(const Duration(days: 1))
        .toString()
        .split(' ')[0];
    if (dateStr == yesterday) return "어제";

    return dateStr.replaceAll('-', '. ');
  }

  Widget _buildProfileCard(MyUserInfo info) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F462C),
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            '(${info.mail})',
            style: const TextStyle(color: Colors.white60, fontSize: 13),
          ),
          Text(
            '${info.name} 님의 포인트',
            style: const TextStyle(color: Colors.white60, fontSize: 13),
          ),
          const SizedBox(height: 10),
          Text(
            '${info.points.toInt()}P',
            style: const TextStyle(
              color: Color(0xFF00FF9C),
              fontSize: 42,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 25),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              infoSubItem('탄소 저감량', '${info.carbon.toStringAsFixed(0)}g'),
              infoSubItem(
                '심은 소나무',
                '${(info.carbon / 6600).toStringAsFixed(2)}그루',
              ),
              infoSubItem('분류 거절', '${info.rejectCount}회'),
            ],
          ),
        ],
      ),
    );
  }
}
