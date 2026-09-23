// 앱 진입점, 인증 상태 관리
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:smartecobin/login_screen.dart';
import 'package:smartecobin/home_screen.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );
  runApp(const EcoCycleApp());
}

class EcoCycleApp extends StatefulWidget {
  const EcoCycleApp({super.key});

  @override
  State<EcoCycleApp> createState() => _EcoCycleAppState();
}

class _EcoCycleAppState extends State<EcoCycleApp> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    _setupAuthListener();
  }

  void _setupAuthListener() {
    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      final AuthChangeEvent event = data.event;
      final Session? session = data.session;

      if (event == AuthChangeEvent.signedOut || session == null) {
        _navigatorKey.currentState?.pushNamedAndRemoveUntil(
          '/login',
          (route) => false,
        );
      } else if (event == AuthChangeEvent.signedIn) {
        _navigatorKey.currentState?.pushNamedAndRemoveUntil(
          '/home',
          (route) => false,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final initialSession = Supabase.instance.client.auth.currentSession;

    return MaterialApp(
      navigatorKey: _navigatorKey,
      debugShowCheckedModeBanner: false,
      initialRoute: initialSession == null ? '/login' : '/home',
      routes: {
        '/login': (context) => const LoginPage(),
        '/home': (context) => const RecycleMainPage(),
      },
    );
  }
}
