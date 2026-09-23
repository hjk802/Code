// 데이터 가져오기, 업데이트
import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:smartecobin/recycle_mapping.dart';

class DataService {
  static Future<MyUserInfo> fetchMyProfile() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) throw Exception("로그인이 필요합니다.");

    try {
      final data = await Supabase.instance.client
          .from('users')
          .select()
          .eq('id', user.id)
          .maybeSingle();

      if (data == null) {
        throw Exception("사용자 정보를 찾을 수 없습니다. (DB 확인 필요)");
      }
      return MyUserInfo.fromMap(data);
    } catch (e) {
      rethrow;
    }
  }

  static Future<void> updateProfileName(String newName) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    await Supabase.instance.client
        .from('users')
        .update({'name': newName})
        .eq('id', user.id);

    await Supabase.instance.client.auth.updateUser(
      UserAttributes(data: {'name': newName}),
    );
  }

  static Future<List<WasteLog>> getLogs({
    String? lastDate,
    int limit = 10,
  }) async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return [];

    try {
      var query = Supabase.instance.client
          .from('waste_logs')
          .select()
          .eq('user_id', userId);

      if (lastDate != null) {
        DateTime lastDateKST = DateTime.parse(lastDate);
        String lastDateUTC = lastDateKST.toUtc().toIso8601String();
        query = query.lt('created_at', lastDateUTC);
      }

      final List<dynamic> data = await query
          .order('created_at', ascending: false)
          .limit(limit);

      return data.map((e) {
        if (e['created_at'] != null) {
          e['created_at'] = DateTime.parse(
            e['created_at'],
          ).toLocal().toIso8601String();
        }
        return WasteLog.fromMap(e);
      }).toList();
    } catch (e) {
      return [];
    }
  }
}
