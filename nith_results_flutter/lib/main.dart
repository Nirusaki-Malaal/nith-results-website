import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const NithResultsApp());
}

class NithResultsApp extends StatelessWidget {
  const NithResultsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'NITH Results',
      themeMode: ThemeMode.system,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF006D42),
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF8DD8A8),
        brightness: Brightness.dark,
      ),
      home: const ResultsPage(),
    );
  }
}

class ResultsPage extends StatefulWidget {
  const ResultsPage({super.key});

  @override
  State<ResultsPage> createState() => _ResultsPageState();
}

class _ResultsPageState extends State<ResultsPage> {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8001',
  );

  final TextEditingController _searchController = TextEditingController();
  final Map<String, String> _branchMap = {
    'BAR': 'Architecture',
    'BCE': 'Civil Engineering',
    'BCH': 'Chemical Engineering',
    'BEC': 'Electronics & Communication',
    'BEE': 'Electrical Engineering',
    'BMA': 'Mathematics & Computing',
    'BME': 'Mechanical Engineering',
    'BMS': 'Material Science',
    'BPH': 'Engineering Physics',
    'DCS': 'Dual Degree Computer Science',
    'BCS': 'Computer Science',
    'DEC': 'Dual Degree Electronics',
  };

  List<StudentResult> _allStudents = [];
  bool _loading = true;
  String? _error;
  String _query = '';
  String _selectedBranch = 'All';

  @override
  void initState() {
    super.initState();
    _loadDocuments();
    _searchController.addListener(() {
      setState(() {
        _query = _searchController.text.trim().toLowerCase();
      });
    });
  }

  Future<void> _loadDocuments() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final uri = Uri.parse('$baseUrl/documents');
      final response = await http.get(uri);
      if (response.statusCode != 200) {
        throw Exception('HTTP ${response.statusCode}');
      }
      final decoded = jsonDecode(response.body) as List<dynamic>;
      final parsed = decoded
          .map((e) => StudentResult.fromMap(e as Map<String, dynamic>, _branchMap))
          .toList()
        ..sort((a, b) => b.cgpa.compareTo(a.cgpa));

      setState(() {
        _allStudents = parsed;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load results: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  List<StudentResult> get _filteredStudents {
    return _allStudents.where((student) {
      final matchesBranch =
          _selectedBranch == 'All' || student.branchCode == _selectedBranch;
      final matchesQuery = _query.isEmpty ||
          student.name.toLowerCase().contains(_query) ||
          student.roll.toLowerCase().contains(_query);
      return matchesBranch && matchesQuery;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredStudents;
    final branches = ['All', ..._branchMap.keys.toList()..sort()];

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDocuments,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: _HeaderCard(totalStudents: _allStudents.length),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search by name or roll number',
                      prefixIcon: const Icon(Icons.search_rounded),
                      suffixIcon: _query.isEmpty
                          ? null
                          : IconButton(
                              onPressed: () => _searchController.clear(),
                              icon: const Icon(Icons.clear_rounded),
                            ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(28),
                      ),
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 42,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    scrollDirection: Axis.horizontal,
                    itemBuilder: (_, index) {
                      final code = branches[index];
                      final selected = _selectedBranch == code;
                      return ChoiceChip(
                        label: Text(code == 'All' ? 'All Branches' : code),
                        selected: selected,
                        onSelected: (_) {
                          setState(() {
                            _selectedBranch = code;
                          });
                        },
                      );
                    },
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemCount: branches.length,
                  ),
                ),
              ),
              if (_loading)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                SliverFillRemaining(
                  child: _ErrorState(
                    message: _error!,
                    onRetry: _loadDocuments,
                  ),
                )
              else if (filtered.isEmpty)
                const SliverFillRemaining(
                  child: Center(child: Text('No results matched your filters.')),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverGrid(
                    delegate: SliverChildBuilderDelegate(
                      (_, index) {
                        final student = filtered[index];
                        return _StudentCard(
                          student: student,
                          onTap: () => _openDetails(student),
                        );
                      },
                      childCount: filtered.length,
                    ),
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 420,
                      mainAxisExtent: 170,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openDetails(StudentResult student) async {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.8,
        maxChildSize: 0.95,
        builder: (_, controller) {
          return ListView(
            controller: controller,
            padding: const EdgeInsets.all(20),
            children: [
              Text(student.name,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      )),
              const SizedBox(height: 6),
              Text('${student.roll} • ${student.branchName}'),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _scoreChip('CGPA', student.cgpa),
                  _scoreChip('Latest SGPA', student.latestSgpa),
                ],
              ),
              const SizedBox(height: 20),
              ...student.semesters.entries.map((entry) {
                final sem = entry.value;
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ExpansionTile(
                    title: Text(entry.key),
                    subtitle: Text('SGPA ${sem.sgpa.toStringAsFixed(2)}'),
                    children: sem.subjects
                        .map((subject) => ListTile(
                              dense: true,
                              title: Text(subject.name),
                              subtitle: Text('Credits ${subject.credits}'),
                              trailing: Text(subject.grade),
                            ))
                        .toList(),
                  ),
                );
              }),
            ],
          );
        },
      ),
    );
  }

  Widget _scoreChip(String label, double value) {
    return Chip(
      avatar: const Icon(Icons.auto_graph_rounded, size: 18),
      label: Text('$label: ${value.toStringAsFixed(2)}'),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  final int totalStudents;

  const _HeaderCard({required this.totalStudents});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF006D42), Color(0xFF4CAF72)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'NIT Hamirpur',
            style: Theme.of(context)
                .textTheme
                .labelLarge
                ?.copyWith(color: Colors.white.withOpacity(0.9)),
          ),
          const SizedBox(height: 6),
          Text(
            'Student Results',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 10),
          Text(
            '$totalStudents records loaded',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: Colors.white.withOpacity(0.9)),
          ),
        ],
      ),
    );
  }
}

class _StudentCard extends StatelessWidget {
  final StudentResult student;
  final VoidCallback onTap;

  const _StudentCard({required this.student, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                student.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(student.roll),
              const Spacer(),
              Row(
                children: [
                  Expanded(child: Text(student.branchCode)),
                  Text('CGPA ${student.cgpa.toStringAsFixed(2)}'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded, size: 50),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton.tonal(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

class StudentResult {
  final String name;
  final String roll;
  final String branchCode;
  final String branchName;
  final double cgpa;
  final double latestSgpa;
  final Map<String, SemesterResult> semesters;

  StudentResult({
    required this.name,
    required this.roll,
    required this.branchCode,
    required this.branchName,
    required this.cgpa,
    required this.latestSgpa,
    required this.semesters,
  });

  factory StudentResult.fromMap(
    Map<String, dynamic> raw,
    Map<String, String> branchMap,
  ) {
    final studentInfo = (raw['student_info'] as Map<String, dynamic>? ?? {});
    final roll = (studentInfo['roll_number'] ?? 'UNKNOWN').toString();
    final branchCode = _extractBranchCode(roll);
    final branchName = branchMap[branchCode] ?? branchCode;

    final semesterRaw = raw['semesters'] as Map<String, dynamic>? ?? {};
    final semesterEntries = semesterRaw.entries
        .map((entry) => MapEntry(
              entry.key,
              SemesterResult.fromMap(entry.value as Map<String, dynamic>),
            ))
        .toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    final semesterMap = Map<String, SemesterResult>.fromEntries(semesterEntries);

    double totalCredits = 0;
    double totalPoints = 0;
    double latestSgpa = 0;
    for (final sem in semesterMap.values) {
      if (sem.totalCredits > 0) {
        latestSgpa = sem.sgpa;
      }
      totalCredits += sem.totalCredits;
      totalPoints += sem.totalPoints;
    }

    return StudentResult(
      name: (studentInfo['student_name'] ?? 'Unknown').toString(),
      roll: roll,
      branchCode: branchCode,
      branchName: branchName,
      cgpa: totalCredits == 0 ? 0 : totalPoints / totalCredits,
      latestSgpa: latestSgpa,
      semesters: semesterMap,
    );
  }

  static String _extractBranchCode(String roll) {
    final match = RegExp(r'^\d{2}([A-Z]+)\d+$').firstMatch(roll);
    return match?.group(1) ?? 'UNK';
  }
}

class SemesterResult {
  final List<SubjectResult> subjects;
  final double totalCredits;
  final double totalPoints;

  const SemesterResult({
    required this.subjects,
    required this.totalCredits,
    required this.totalPoints,
  });

  double get sgpa => totalCredits == 0 ? 0 : totalPoints / totalCredits;

  factory SemesterResult.fromMap(Map<String, dynamic> raw) {
    final subjectRaw = raw['subjects'] as List<dynamic>? ?? [];
    final subjects = subjectRaw
        .map((e) => SubjectResult.fromMap(e as Map<String, dynamic>))
        .toList();

    final credits = subjects.fold<double>(0, (sum, s) => sum + s.credits);
    final points = subjects.fold<double>(0, (sum, s) => sum + (s.credits * s.gradePoint));

    return SemesterResult(subjects: subjects, totalCredits: credits, totalPoints: points);
  }
}

class SubjectResult {
  final String name;
  final String grade;
  final double credits;

  const SubjectResult({
    required this.name,
    required this.grade,
    required this.credits,
  });

  factory SubjectResult.fromMap(Map<String, dynamic> raw) {
    return SubjectResult(
      name: (raw['subject_name'] ?? 'Subject').toString(),
      grade: (raw['grade'] ?? 'F').toString().toUpperCase(),
      credits: double.tryParse(raw['credits'].toString()) ?? 0,
    );
  }

  double get gradePoint {
    const gradeMap = {
      'AA': 10,
      'A+': 10,
      'O': 10,
      'A': 10,
      'AB': 9,
      'BB': 8,
      'B': 8,
      'BC': 7,
      'B-': 7,
      'CC': 6,
      'C': 6,
      'CD': 5,
      'D': 4,
      'F': 0,
      'I': 0,
    };
    return (gradeMap[grade] ?? 0).toDouble();
  }
}
