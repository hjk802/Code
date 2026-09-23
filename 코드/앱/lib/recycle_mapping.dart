// 데이터 모델링
class WasteLog {
  final String trashType;
  final double weight;
  final double points;
  final double carbon;
  final DateTime createdAt;
  final String? rejectionReason;

  String get dateString =>
      "${createdAt.year}-${createdAt.month.toString().padLeft(2, '0')}-${createdAt.day.toString().padLeft(2, '0')}";

  WasteLog({
    required this.trashType,
    required this.weight,
    required this.points,
    required this.carbon,
    required this.createdAt,
    this.rejectionReason,
  });

  factory WasteLog.fromMap(Map<String, dynamic> map) {
    return WasteLog(
      trashType: map['trash_type']?.toString() ?? '알 수 없음',
      weight: (map['trash_weight_gram'] as num? ?? 0).toDouble(),
      points: (map['point_earned'] as num? ?? 0).toDouble(),
      carbon: (map['carbon_reduction_gram'] as num? ?? 0).toDouble(),
      createdAt: map['created_at'] != null
          ? DateTime.parse(map['created_at'])
          : DateTime.now(),
      rejectionReason: map['rejection_reason'],
    );
  }
}

class MyUserInfo {
  final String name;
  final String mail;
  final double points;
  final double carbon;
  final int rejectCount;

  MyUserInfo({
    required this.name,
    required this.mail,
    required this.points,
    required this.carbon,
    required this.rejectCount,
  });

  factory MyUserInfo.fromMap(Map<String, dynamic> map) {
    return MyUserInfo(
      name: map['name']?.toString() ?? '이름 없음',
      mail: map['mail']?.toString() ?? '',
      points: (map['total_points'] as num? ?? 0).toDouble(),
      carbon: (map['total_carbon_reduction_gram'] as num? ?? 0).toDouble(),
      rejectCount: (map['total_rej'] as num? ?? 0).toInt(),
    );
  }
}

enum AppStep { ready, processing, success, fail, myPage }
