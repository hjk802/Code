// 동작 결과 UI 컴포넌트
import 'package:flutter/material.dart';

Widget infoSubItem(String label, String value) {
  return Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
      const SizedBox(height: 4),
      Text(
        value,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w900,
          fontSize: 16,
        ),
      ),
    ],
  );
}

Widget activityTile({
  required String title,
  required double point,
  required double carbon,
  required String date,
  String? reason,
}) {
  final bool isRejected = reason != null && reason.isNotEmpty;
  final Color statusColor = isRejected
      ? Colors.redAccent
      : const Color(0xFF0F462C);

  return Container(
    margin: const EdgeInsets.only(bottom: 12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(15),
      border: Border.all(color: Colors.grey.withValues(alpha: 0.1)),
    ),
    child: ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: statusColor.withValues(alpha: 0.1),
          shape: BoxShape.circle,
        ),
        child: Icon(
          isRejected ? Icons.report_problem_rounded : Icons.recycling_rounded,
          color: statusColor,
          size: 24,
        ),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isRejected)
            Text(
              reason,
              style: const TextStyle(
                color: Colors.redAccent,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          Text(date, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            isRejected ? "${point.toInt()} P" : "+${point.toInt()} P",
            style: TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 17,
              color: statusColor,
            ),
          ),
          if (!isRejected)
            Text(
              '${carbon.toStringAsFixed(1)}g',
              style: const TextStyle(fontSize: 11, color: Colors.blueGrey),
            ),
        ],
      ),
    ),
  );
}
